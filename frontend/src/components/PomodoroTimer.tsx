"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { TimerState } from "@/lib/types";

interface PomodoroTimerProps {
    socket: Socket;
    isHost: boolean;
    initialState: TimerState;
}

/**
 * PomodoroTimer Component
 * Displays synchronized timer with circular progress
 */
export default function PomodoroTimer({ socket, isHost, initialState }: PomodoroTimerProps) {
    const [timerState, setTimerState] = useState<TimerState>(initialState);
    const intervalRef = useRef<number | null>(null);
    const lastSyncRef = useRef<number>(0);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Calculate progress percentage for circular display
    const getProgress = (): number => {
        const totalDuration = timerState.isBreak
            ? timerState.breakDuration
            : timerState.workDuration;
        return ((totalDuration - timerState.timeRemaining) / totalDuration) * 100;
    };

    // Handle timer tick (only host sends updates)
    const tick = useCallback(() => {
        setTimerState((prev) => {
            if (!prev.isRunning || prev.timeRemaining <= 0) {
                return prev;
            }

            const newTime = prev.timeRemaining - 1;

            // Host sends periodic updates every second
            if (isHost) {
                socket.emit("timer-tick", {
                    timeRemaining: newTime,
                    isRunning: true,
                    isBreak: prev.isBreak
                });
            }

            // Timer completed
            if (newTime <= 0) {
                // Auto switch mode when timer ends
                if (isHost) {
                    socket.emit("timer-switch-mode");
                }
                return { ...prev, timeRemaining: 0, isRunning: false };
            }

            return { ...prev, timeRemaining: newTime };
        });
    }, [isHost, socket]);

    // Set up interval for timer
    useEffect(() => {
        if (timerState.isRunning) {
            intervalRef.current = window.setInterval(tick, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timerState.isRunning, tick]);

    // Listen for timer sync from server
    useEffect(() => {
        const handleTimerSync = (data: Partial<TimerState>) => {
            // Prevent rapid updates
            const now = Date.now();
            if (now - lastSyncRef.current < 500) return;
            lastSyncRef.current = now;

            setTimerState((prev) => ({
                ...prev,
                ...data
            }));
        };

        socket.on("timer-sync", handleTimerSync);

        return () => {
            socket.off("timer-sync", handleTimerSync);
        };
    }, [socket]);

    // Timer controls (host only)
    const handleStart = () => {
        if (!isHost) return;
        socket.emit("timer-start");
        setTimerState((prev) => ({ ...prev, isRunning: true }));
    };

    const handlePause = () => {
        if (!isHost) return;
        socket.emit("timer-pause");
        setTimerState((prev) => ({ ...prev, isRunning: false }));
    };

    const handleReset = () => {
        if (!isHost) return;
        socket.emit("timer-reset");
        const duration = timerState.isBreak ? timerState.breakDuration : timerState.workDuration;
        setTimerState((prev) => ({ ...prev, isRunning: false, timeRemaining: duration }));
    };

    const handleSwitch = () => {
        if (!isHost) return;
        socket.emit("timer-switch-mode");
        const newIsBreak = !timerState.isBreak;
        const duration = newIsBreak ? timerState.breakDuration : timerState.workDuration;
        setTimerState((prev) => ({
            ...prev,
            isBreak: newIsBreak,
            isRunning: false,
            timeRemaining: duration
        }));
    };

    const strokeDashoffset = 283 - (283 * getProgress()) / 100;

    return (
        <div className="glass-card rounded-2xl p-6 lg:p-8">
            {/* Mode Indicator */}
            <div className="text-center mb-6">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${timerState.isBreak
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${timerState.isRunning ? "animate-pulse" : ""
                        } ${timerState.isBreak ? "bg-green-400" : "bg-red-400"}`}></span>
                    {timerState.isBreak ? "Break Time" : "Focus Time"}
                </span>
            </div>

            {/* Circular Timer Display */}
            <div className="relative w-48 h-48 mx-auto mb-8">
                {/* Background Circle */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="rgba(71, 85, 105, 0.3)"
                        strokeWidth="6"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={timerState.isBreak ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="timer-circle"
                        style={{ strokeDashoffset }}
                    />
                </svg>

                {/* Time Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-bold font-mono ${timerState.isRunning ? "text-white" : "text-slate-300"
                        }`}>
                        {formatTime(timerState.timeRemaining)}
                    </span>
                    <span className="text-slate-500 text-sm mt-1">
                        {timerState.isBreak ? "5:00 break" : "25:00 focus"}
                    </span>
                </div>
            </div>

            {/* Controls */}
            {isHost ? (
                <div className="flex flex-wrap justify-center gap-3">
                    {timerState.isRunning ? (
                        <button
                            onClick={handlePause}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pause
                        </button>
                    ) : (
                        <button
                            onClick={handleStart}
                            className="btn-primary flex items-center gap-2 pulse-glow"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Start
                        </button>
                    )}

                    <button
                        onClick={handleReset}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset
                    </button>

                    <button
                        onClick={handleSwitch}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        {timerState.isBreak ? "Work" : "Break"}
                    </button>
                </div>
            ) : (
                <p className="text-center text-slate-500 text-sm">
                    Only the host can control the timer
                </p>
            )}
        </div>
    );
}
