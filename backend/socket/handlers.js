/**
 * Socket.io Event Handlers
 * Manages real-time communication for chat, timer sync, and WebRTC signaling
 */

const { verifyToken } = require('../utils/jwt');
const Room = require('../models/Room');

// In-memory storage for room messages (session-only, not persisted)
const roomMessages = new Map();

// In-memory storage for connected users per room
const roomUsers = new Map();

/**
 * Initialize Socket.io handlers
 * @param {Server} io - Socket.io server instance
 */
const initializeSocket = (io) => {
    // Authentication middleware for socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return next(new Error('Invalid token'));
        }

        // Attach user info to socket
        socket.userId = decoded.id;
        socket.username = decoded.username;
        next();
    });

    io.on('connection', (socket) => {
        console.log(`✅ User connected: ${socket.username} (${socket.id})`);

        /**
         * JOIN ROOM
         * User joins a specific room for collaboration
         */
        socket.on('join-room', async (roomId) => {
            try {
                const room = await Room.findOne({ roomId });

                if (!room) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }

                // Join Socket.io room
                socket.join(roomId);
                socket.currentRoom = roomId;

                // Track user in room
                if (!roomUsers.has(roomId)) {
                    roomUsers.set(roomId, new Map());
                }
                roomUsers.get(roomId).set(socket.id, {
                    id: socket.userId,
                    username: socket.username,
                    socketId: socket.id
                });

                // Initialize messages for room if not exists
                if (!roomMessages.has(roomId)) {
                    roomMessages.set(roomId, []);
                }

                // Send current room state to the joining user
                socket.emit('room-state', {
                    timerState: room.timerState,
                    messages: roomMessages.get(roomId),
                    users: Array.from(roomUsers.get(roomId).values()),
                    hostId: room.host.toString()
                });

                // Notify others that user joined
                socket.to(roomId).emit('user-joined', {
                    id: socket.userId,
                    username: socket.username,
                    socketId: socket.id
                });

                // Send updated user list to all
                io.to(roomId).emit('users-update',
                    Array.from(roomUsers.get(roomId).values())
                );

                console.log(`👤 ${socket.username} joined room ${roomId}`);
            } catch (error) {
                console.error('Join room error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        /**
         * LEAVE ROOM
         * User leaves the current room
         */
        socket.on('leave-room', () => {
            handleLeaveRoom(socket, io);
        });

        /**
         * CHAT MESSAGE
         * Broadcast message to all users in the room
         */
        socket.on('send-message', (data) => {
            const { content } = data;
            const roomId = socket.currentRoom;

            if (!roomId || !content) return;

            const message = {
                id: Date.now().toString(),
                userId: socket.userId,
                username: socket.username,
                content: content.trim(),
                timestamp: new Date().toISOString()
            };

            // Store message in memory
            if (roomMessages.has(roomId)) {
                const messages = roomMessages.get(roomId);
                messages.push(message);
                // Keep only last 100 messages
                if (messages.length > 100) {
                    messages.shift();
                }
            }

            // Broadcast to all users in room (including sender)
            io.to(roomId).emit('receive-message', message);
        });

        /**
         * TIMER CONTROLS (Host Only)
         * Start, pause, reset the Pomodoro timer
         */
        socket.on('timer-start', async () => {
            await handleTimerAction(socket, io, 'start');
        });

        socket.on('timer-pause', async () => {
            await handleTimerAction(socket, io, 'pause');
        });

        socket.on('timer-reset', async () => {
            await handleTimerAction(socket, io, 'reset');
        });

        socket.on('timer-switch-mode', async () => {
            await handleTimerAction(socket, io, 'switch');
        });

        /**
         * TIMER TICK
         * Host sends periodic timer updates
         */
        socket.on('timer-tick', async (data) => {
            const roomId = socket.currentRoom;
            if (!roomId) return;

            // Update room timer state in database
            await Room.findOneAndUpdate(
                { roomId },
                {
                    'timerState.timeRemaining': data.timeRemaining,
                    'timerState.isRunning': data.isRunning
                }
            );

            // Broadcast to all users except sender
            socket.to(roomId).emit('timer-sync', data);
        });

        /**
         * WEBRTC SIGNALING
         * Handle peer-to-peer connection setup for multi-user video calls
         */

        // User is ready to receive video calls
        socket.on('video-ready', () => {
            const roomId = socket.currentRoom;
            if (!roomId) return;

            // Notify other users that this user is ready for video
            socket.to(roomId).emit('video-user-ready', {
                socketId: socket.id,
                username: socket.username
            });
        });

        // WebRTC offer (initiating connection)
        socket.on('video-offer', (data) => {
            const { targetSocketId, offer } = data;
            io.to(targetSocketId).emit('video-offer', {
                fromSocketId: socket.id,
                username: socket.username,
                offer
            });
        });

        // WebRTC answer (responding to offer)
        socket.on('video-answer', (data) => {
            const { targetSocketId, answer } = data;
            io.to(targetSocketId).emit('video-answer', {
                fromSocketId: socket.id,
                answer
            });
        });

        // ICE candidate exchange
        socket.on('video-ice-candidate', (data) => {
            const { targetSocketId, candidate } = data;
            io.to(targetSocketId).emit('video-ice-candidate', {
                fromSocketId: socket.id,
                candidate
            });
        });

        // User leaving video call
        socket.on('video-leave', () => {
            const roomId = socket.currentRoom;
            if (!roomId) return;

            socket.to(roomId).emit('video-user-left', {
                socketId: socket.id
            });
        });

        /**
         * DISCONNECT
         * Handle user disconnection
         */
        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.username} (${socket.id})`);
            handleLeaveRoom(socket, io);
        });
    });
};

/**
 * Handle timer actions (start, pause, reset, switch)
 */
async function handleTimerAction(socket, io, action) {
    const roomId = socket.currentRoom;
    if (!roomId) return;

    try {
        const room = await Room.findOne({ roomId });
        if (!room) return;

        // Check if user is host
        if (room.host.toString() !== socket.userId) {
            socket.emit('error', { message: 'Only the host can control the timer' });
            return;
        }

        let updateData = {};
        let newState = { ...room.timerState.toObject() };

        switch (action) {
            case 'start':
                updateData = {
                    'timerState.isRunning': true,
                    'timerState.startedAt': new Date()
                };
                newState.isRunning = true;
                newState.startedAt = new Date();
                break;

            case 'pause':
                updateData = {
                    'timerState.isRunning': false
                };
                newState.isRunning = false;
                break;

            case 'reset':
                const duration = room.timerState.isBreak
                    ? room.timerState.breakDuration
                    : room.timerState.workDuration;
                updateData = {
                    'timerState.isRunning': false,
                    'timerState.timeRemaining': duration,
                    'timerState.startedAt': null
                };
                newState.isRunning = false;
                newState.timeRemaining = duration;
                newState.startedAt = null;
                break;

            case 'switch':
                const isNowBreak = !room.timerState.isBreak;
                const newDuration = isNowBreak
                    ? room.timerState.breakDuration
                    : room.timerState.workDuration;
                updateData = {
                    'timerState.isBreak': isNowBreak,
                    'timerState.isRunning': false,
                    'timerState.timeRemaining': newDuration,
                    'timerState.startedAt': null
                };
                newState.isBreak = isNowBreak;
                newState.isRunning = false;
                newState.timeRemaining = newDuration;
                newState.startedAt = null;
                break;
        }

        await Room.findOneAndUpdate({ roomId }, updateData);

        // Broadcast new timer state to all users in room
        io.to(roomId).emit('timer-sync', newState);

    } catch (error) {
        console.error('Timer action error:', error);
        socket.emit('error', { message: 'Failed to update timer' });
    }
}

/**
 * Handle user leaving a room
 */
function handleLeaveRoom(socket, io) {
    const roomId = socket.currentRoom;
    if (!roomId) return;

    // Remove from room users
    if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.id);

        // Clean up empty rooms
        if (roomUsers.get(roomId).size === 0) {
            roomUsers.delete(roomId);
            roomMessages.delete(roomId);
        } else {
            // Notify remaining users
            io.to(roomId).emit('user-left', {
                id: socket.userId,
                username: socket.username,
                socketId: socket.id
            });

            io.to(roomId).emit('users-update',
                Array.from(roomUsers.get(roomId).values())
            );

            // Notify video leave
            io.to(roomId).emit('video-user-left', {
                socketId: socket.id
            });
        }
    }

    socket.leave(roomId);
    socket.currentRoom = null;
}

module.exports = initializeSocket;
