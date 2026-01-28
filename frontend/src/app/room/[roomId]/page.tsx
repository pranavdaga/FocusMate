"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { roomApi } from "@/lib/api";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import { Room, RoomUser, Message, TimerState, User } from "@/lib/types";
import PomodoroTimer from "@/components/PomodoroTimer";
import Chat from "@/components/Chat";
import VideoCall from "@/components/VideoCall";
import { Socket } from "socket.io-client";

/**
 * Room Page
 * Main collaboration room with timer, chat, and video
 */
export default function RoomPage() {
    const router = useRouter();
    const params = useParams();
    const roomId = params.roomId as string;

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [users, setUsers] = useState<RoomUser[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [timerState, setTimerState] = useState<TimerState | null>(null);
    const [hostId, setHostId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Initialize socket and join room
    const initializeRoom = useCallback(async () => {
        try {
            // Get user from localStorage
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                router.push("/auth/login");
                return;
            }
            const user = JSON.parse(storedUser);
            setCurrentUser(user);

            // Fetch room data
            const response = await roomApi.getOne(roomId);
            setRoom(response.data.room);
            setTimerState(response.data.room.timerState);
            setHostId(response.data.room.host._id);

            // Connect socket
            const sock = getSocket();
            setSocket(sock);
            connectSocket();

            // Wait for connection
            sock.on("connect", () => {
                setIsConnected(true);
                sock.emit("join-room", roomId);
            });

            sock.on("connect_error", (err: Error) => {
                console.error("Socket connection error:", err);
                setError("Failed to connect to room. Please refresh.");
            });

            // Room state received after joining
            sock.on("room-state", (data: {
                timerState: TimerState;
                messages: Message[];
                users: RoomUser[];
                hostId: string;
            }) => {
                setTimerState(data.timerState);
                setMessages(data.messages);
                setUsers(data.users);
                setHostId(data.hostId);
                setLoading(false);
            });

            // User updates
            sock.on("users-update", (updatedUsers: RoomUser[]) => {
                setUsers(updatedUsers);
            });

            sock.on("user-joined", (user: RoomUser) => {
                // Show notification toast could go here
                console.log(`${user.username} joined the room`);
            });

            sock.on("user-left", (user: { username: string }) => {
                console.log(`${user.username} left the room`);
            });

            sock.on("error", (data: { message: string }) => {
                setError(data.message);
            });

        } catch (err) {
            console.error("Failed to initialize room:", err);
            setError("Room not found or you don't have access.");
            setLoading(false);
        }
    }, [roomId, router]);

    useEffect(() => {
        initializeRoom();

        return () => {
            disconnectSocket();
        };
    }, [initializeRoom]);

    // Leave room handler
    const handleLeaveRoom = () => {
        if (socket) {
            socket.emit("leave-room");
        }
        disconnectSocket();
        router.push("/dashboard");
    };

    // Copy room ID to clipboard
    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            // Could show a toast notification here
        } catch {
            console.error("Failed to copy room ID");
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                    <p className="text-slate-400">Joining room...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="glass-card rounded-2xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-2">Oops!</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button onClick={() => router.push("/dashboard")} className="btn-primary">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const isHost = currentUser?.id === hostId;

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="glass sticky top-0 z-50 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLeaveRoom}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Leave room"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="font-semibold text-slate-200">{room?.name}</h1>
                            <button
                                onClick={copyRoomId}
                                className="text-sm text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                                title="Click to copy"
                            >
                                <span className="font-mono">{roomId}</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Connection status and users */}
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}></div>
                            <span className="text-sm text-slate-400">
                                {users.length} online
                            </span>
                        </div>

                        {/* User avatars */}
                        <div className="flex -space-x-2">
                            {users.slice(0, 5).map((user) => (
                                <div
                                    key={user.socketId}
                                    className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-medium text-white border-2 border-slate-900"
                                    title={user.username}
                                >
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                            ))}
                            {users.length > 5 && (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300 border-2 border-slate-900">
                                    +{users.length - 5}
                                </div>
                            )}
                        </div>

                        {isHost && (
                            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full font-medium">
                                Host
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* Left Column - Timer & Video */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Pomodoro Timer */}
                        {socket && timerState && (
                            <PomodoroTimer
                                socket={socket}
                                isHost={isHost}
                                initialState={timerState}
                            />
                        )}

                        {/* Video Call */}
                        {socket && (
                            <VideoCall socket={socket} roomId={roomId} />
                        )}
                    </div>

                    {/* Right Column - Chat */}
                    <div className="lg:h-[calc(100vh-10rem)]">
                        {socket && currentUser && (
                            <Chat
                                socket={socket}
                                currentUserId={currentUser.id}
                                initialMessages={messages}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
