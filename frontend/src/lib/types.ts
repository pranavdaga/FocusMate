/**
 * TypeScript Type Definitions
 * Shared types used across the application
 */

export interface User {
    id: string;
    username: string;
    email: string;
}

export interface RoomUser {
    id: string;
    username: string;
    socketId: string;
}

export interface Message {
    id: string;
    userId: string;
    username: string;
    content: string;
    timestamp: string;
}

export interface TimerState {
    isRunning: boolean;
    timeRemaining: number;
    isBreak: boolean;
    startedAt: string | null;
    workDuration: number;
    breakDuration: number;
}

export interface Room {
    id: string;
    roomId: string;
    name: string;
    host: {
        _id: string;
        username: string;
    };
    participants: Array<{
        _id: string;
        username: string;
    }>;
    timerState: TimerState;
    createdAt: string;
}

export interface RoomListItem {
    id: string;
    roomId: string;
    name: string;
    host: {
        _id: string;
        username: string;
    };
    participantCount: number;
    timerState: {
        isRunning: boolean;
        isBreak: boolean;
    };
    createdAt: string;
}
