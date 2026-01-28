/**
 * Socket.io Client
 * Singleton socket instance with authentication
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * Get or create socket connection
 * @returns Socket instance
 */
export const getSocket = (): Socket => {
    if (!socket) {
        const token = typeof window !== 'undefined'
            ? localStorage.getItem('token')
            : null;

        socket = io(SOCKET_URL, {
            auth: { token },
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
    }
    return socket;
};

/**
 * Connect to socket server
 */
export const connectSocket = (): void => {
    const sock = getSocket();

    // Update auth token before connecting
    const token = localStorage.getItem('token');
    sock.auth = { token };

    if (!sock.connected) {
        sock.connect();
    }
};

/**
 * Disconnect from socket server
 */
export const disconnectSocket = (): void => {
    if (socket?.connected) {
        socket.disconnect();
    }
};

/**
 * Reset socket instance (for logout)
 */
export const resetSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export default getSocket;
