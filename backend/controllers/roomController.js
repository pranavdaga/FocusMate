/**
 * Room Controller
 * Handles room creation, listing, and joining
 */

const Room = require('../models/Room');

/**
 * Create a new room
 * POST /api/rooms
 */
const createRoom = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Room name is required'
            });
        }

        // Create room with current user as host
        const room = await Room.create({
            name,
            host: req.user._id,
            participants: [req.user._id]
        });

        // Populate host info
        await room.populate('host', 'username');

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            room: {
                id: room._id,
                roomId: room.roomId,
                name: room.name,
                host: room.host,
                participantCount: room.participants.length,
                createdAt: room.createdAt
            }
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating room'
        });
    }
};

/**
 * Get all active rooms
 * GET /api/rooms
 */
const getRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ isActive: true })
            .populate('host', 'username')
            .sort({ createdAt: -1 })
            .limit(50);

        const roomList = rooms.map(room => ({
            id: room._id,
            roomId: room.roomId,
            name: room.name,
            host: room.host,
            participantCount: room.participants.length,
            timerState: {
                isRunning: room.timerState.isRunning,
                isBreak: room.timerState.isBreak
            },
            createdAt: room.createdAt
        }));

        res.json({
            success: true,
            rooms: roomList
        });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching rooms'
        });
    }
};

/**
 * Get single room by roomId
 * GET /api/rooms/:roomId
 */
const getRoom = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId })
            .populate('host', 'username')
            .populate('participants', 'username');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.json({
            success: true,
            room: {
                id: room._id,
                roomId: room.roomId,
                name: room.name,
                host: room.host,
                participants: room.participants,
                timerState: room.timerState,
                createdAt: room.createdAt
            }
        });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching room'
        });
    }
};

/**
 * Join a room
 * POST /api/rooms/:roomId/join
 */
const joinRoom = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Add user to participants if not already in
        if (!room.participants.includes(req.user._id)) {
            room.participants.push(req.user._id);
            await room.save();
        }

        await room.populate('host', 'username');
        await room.populate('participants', 'username');

        res.json({
            success: true,
            message: 'Joined room successfully',
            room: {
                id: room._id,
                roomId: room.roomId,
                name: room.name,
                host: room.host,
                participants: room.participants,
                timerState: room.timerState
            }
        });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error joining room'
        });
    }
};

module.exports = { createRoom, getRooms, getRoom, joinRoom };
