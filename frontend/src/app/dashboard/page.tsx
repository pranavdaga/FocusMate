"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { roomApi } from "@/lib/api";
import { RoomListItem, User } from "@/lib/types";

/**
 * Dashboard Page
 * Displays room list, create room, and join room by ID
 */
export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [rooms, setRooms] = useState<RoomListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [joinRoomId, setJoinRoomId] = useState("");
    const [error, setError] = useState("");

    // Load user and rooms on mount
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await roomApi.getAll();
            setRooms(response.data.rooms);
        } catch (err) {
            console.error("Failed to fetch rooms:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (!newRoomName.trim()) {
            setError("Room name is required");
            return;
        }

        try {
            const response = await roomApi.create({ name: newRoomName.trim() });
            const { roomId } = response.data.room;
            router.push(`/room/${roomId}`);
        } catch (err) {
            console.error("Failed to create room:", err);
            setError("Failed to create room. Please try again.");
        }
    };

    const handleJoinRoom = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (!joinRoomId.trim()) {
            setError("Room ID is required");
            return;
        }

        try {
            await roomApi.join(joinRoomId.trim().toUpperCase());
            router.push(`/room/${joinRoomId.trim().toUpperCase()}`);
        } catch (err) {
            console.error("Failed to join room:", err);
            setError("Room not found. Please check the ID and try again.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        router.push("/auth/login");
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass sticky top-0 z-50 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold gradient-text">FocusFlow</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-slate-400 text-sm hidden sm:block">
                            Welcome, <span className="text-slate-200 font-medium">{user?.username}</span>
                        </span>
                        <button
                            onClick={handleLogout}
                            className="btn-secondary text-sm py-2 px-4"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Room
                    </button>
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                        </svg>
                        Join by ID
                    </button>
                </div>

                {/* Rooms Grid */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-slate-200">Active Rooms</h2>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="glass-card rounded-xl p-6 animate-pulse">
                                    <div className="h-6 bg-slate-700 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
                                    <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                                </div>
                            ))}
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="glass-card rounded-xl p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-slate-300 mb-2">No Active Rooms</h3>
                            <p className="text-slate-500 mb-6">Create a room to start your focus session</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn-primary"
                            >
                                Create Your First Room
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rooms.map((room) => (
                                <div
                                    key={room.id}
                                    onClick={() => router.push(`/room/${room.roomId}`)}
                                    className="glass-card rounded-xl p-6 cursor-pointer hover:border-indigo-500/50 transition-all duration-300 hover:scale-[1.02]"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-slate-200 truncate flex-1">
                                            {room.name}
                                        </h3>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${room.timerState.isRunning
                                                ? room.timerState.isBreak
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                : 'bg-slate-600/50 text-slate-400'
                                            }`}>
                                            {room.timerState.isRunning
                                                ? room.timerState.isBreak ? 'Break' : 'Focus'
                                                : 'Paused'}
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span>Host: {room.host.username}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span>{room.participantCount} participant{room.participantCount !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-indigo-400">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                            </svg>
                                            <span className="font-mono">{room.roomId}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md fade-in">
                        <h2 className="text-xl font-semibold text-slate-200 mb-6">Create New Room</h2>
                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Room Name
                                </label>
                                <input
                                    type="text"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    className="input"
                                    placeholder="e.g., Morning Focus Session"
                                    autoFocus
                                    maxLength={50}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateModal(false); setError(""); setNewRoomName(""); }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Join Room Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md fade-in">
                        <h2 className="text-xl font-semibold text-slate-200 mb-6">Join Room by ID</h2>
                        <form onSubmit={handleJoinRoom} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Room ID
                                </label>
                                <input
                                    type="text"
                                    value={joinRoomId}
                                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                                    className="input font-mono text-center text-lg tracking-widest"
                                    placeholder="ABC123"
                                    autoFocus
                                    maxLength={10}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowJoinModal(false); setError(""); setJoinRoomId(""); }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    Join
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
