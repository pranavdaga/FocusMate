"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { Socket } from "socket.io-client";
import { Message } from "@/lib/types";

interface ChatProps {
    socket: Socket;
    currentUserId: string;
    initialMessages: Message[];
}

/**
 * Chat Component
 * Real-time room-based messaging
 */
export default function Chat({ socket, currentUserId, initialMessages }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Listen for new messages
    useEffect(() => {
        const handleReceiveMessage = (message: Message) => {
            setMessages((prev) => [...prev, message]);
        };

        socket.on("receive-message", handleReceiveMessage);

        return () => {
            socket.off("receive-message", handleReceiveMessage);
        };
    }, [socket]);

    // Send message
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim()) return;

        socket.emit("send-message", { content: newMessage.trim() });
        setNewMessage("");
    };

    // Format timestamp
    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="glass-card rounded-2xl flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwnMessage = msg.userId === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`max-w-[80%] ${isOwnMessage
                                        ? "bg-indigo-600/80 rounded-2xl rounded-tr-sm"
                                        : "bg-slate-700/80 rounded-2xl rounded-tl-sm"
                                    } px-4 py-2 fade-in`}>
                                    {!isOwnMessage && (
                                        <p className="text-xs font-medium text-indigo-400 mb-1">
                                            {msg.username}
                                        </p>
                                    )}
                                    <p className="text-slate-100 break-words">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${isOwnMessage ? "text-indigo-300" : "text-slate-400"
                                        }`}>
                                        {formatTime(msg.timestamp)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="input flex-1"
                        placeholder="Type a message..."
                        maxLength={500}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
