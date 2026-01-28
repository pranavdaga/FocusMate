"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

interface PeerConnection {
    socketId: string;
    username: string;
    connection: RTCPeerConnection;
    stream?: MediaStream;
}

interface VideoCallProps {
    socket: Socket;
    roomId: string;
}

// WebRTC configuration with public STUN servers
const rtcConfig: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

/**
 * VideoCall Component
 * Multi-user WebRTC video calling with Socket.io signaling
 */
export default function VideoCall({ socket, roomId }: VideoCallProps) {
    const [isInCall, setIsInCall] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
    const [error, setError] = useState<string>("");

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Map<string, PeerConnection>>(new Map());



    // Update refs when peers change
    useEffect(() => {
        peersRef.current = peers;
    }, [peers]);

    // Create peer connection for a remote user
    const createPeerConnection = useCallback((socketId: string, username: string): RTCPeerConnection => {
        const peerConnection = new RTCPeerConnection(rtcConfig);

        // Add local stream tracks to the connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle incoming stream from remote peer
        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            setPeers((prev) => {
                const newPeers = new Map(prev);
                const existing = newPeers.get(socketId);
                if (existing) {
                    newPeers.set(socketId, { ...existing, stream: remoteStream });
                }
                return newPeers;
            });
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("video-ice-candidate", {
                    targetSocketId: socketId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === "disconnected" ||
                peerConnection.connectionState === "failed") {
                removePeer(socketId);
            }
        };

        return peerConnection;
    }, [socket]);

    // Remove a peer connection
    const removePeer = useCallback((socketId: string) => {
        const peer = peersRef.current.get(socketId);
        if (peer) {
            peer.connection.close();
            setPeers((prev) => {
                const newPeers = new Map(prev);
                newPeers.delete(socketId);
                return newPeers;
            });
        }
    }, []);

    // Start video call
    const startCall = async () => {
        try {
            setError("");

            // Get local media stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            localStreamRef.current = stream;
            setIsInCall(true);

            // Notify other users that we're ready for video
            socket.emit("video-ready");
        } catch (err) {
            console.error("Failed to start call:", err);
            setError("Could not access camera/microphone. Please check permissions.");
        }
    };

    // End video call
    const endCall = useCallback(() => {
        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        // Close all peer connections
        peersRef.current.forEach((peer) => {
            peer.connection.close();
        });

        setPeers(new Map());
        setIsInCall(false);

        // Notify others
        socket.emit("video-leave");
    }, [socket]);

    // Toggle mute
    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Toggle camera
    const toggleCamera = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    };

    // Socket event handlers
    useEffect(() => {
        // Another user is ready for video - send them an offer
        const handleVideoUserReady = async (data: { socketId: string; username: string }) => {
            if (!isInCall || !localStreamRef.current) return;

            const peerConnection = createPeerConnection(data.socketId, data.username);

            // Create and send offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket.emit("video-offer", {
                targetSocketId: data.socketId,
                offer,
            });

            setPeers((prev) => {
                const newPeers = new Map(prev);
                newPeers.set(data.socketId, {
                    socketId: data.socketId,
                    username: data.username,
                    connection: peerConnection,
                });
                return newPeers;
            });
        };

        // Received an offer - create answer
        const handleVideoOffer = async (data: { fromSocketId: string; username: string; offer: RTCSessionDescriptionInit }) => {
            if (!isInCall || !localStreamRef.current) return;

            const peerConnection = createPeerConnection(data.fromSocketId, data.username);

            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit("video-answer", {
                targetSocketId: data.fromSocketId,
                answer,
            });

            setPeers((prev) => {
                const newPeers = new Map(prev);
                newPeers.set(data.fromSocketId, {
                    socketId: data.fromSocketId,
                    username: data.username,
                    connection: peerConnection,
                });
                return newPeers;
            });
        };

        // Received an answer
        const handleVideoAnswer = async (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
            const peer = peersRef.current.get(data.fromSocketId);
            if (peer) {
                await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        };

        // Received ICE candidate
        const handleIceCandidate = async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
            const peer = peersRef.current.get(data.fromSocketId);
            if (peer) {
                try {
                    await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error("Error adding ICE candidate:", err);
                }
            }
        };

        // User left video call
        const handleVideoUserLeft = (data: { socketId: string }) => {
            removePeer(data.socketId);
        };

        socket.on("video-user-ready", handleVideoUserReady);
        socket.on("video-offer", handleVideoOffer);
        socket.on("video-answer", handleVideoAnswer);
        socket.on("video-ice-candidate", handleIceCandidate);
        socket.on("video-user-left", handleVideoUserLeft);

        return () => {
            socket.off("video-user-ready", handleVideoUserReady);
            socket.off("video-offer", handleVideoOffer);
            socket.off("video-answer", handleVideoAnswer);
            socket.off("video-ice-candidate", handleIceCandidate);
            socket.off("video-user-left", handleVideoUserLeft);
        };
    }, [socket, isInCall, createPeerConnection, removePeer]);


    useEffect(() => {
    if (!isInCall) return;

    if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.muted = true;

        localVideoRef.current
            .play()
            .catch(err => console.warn("Local video play blocked:", err));
    }
}, [isInCall]);


    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            peersRef.current.forEach((peer) => peer.connection.close());
        };
    }, []);

    return (
        <div className="glass-card rounded-2xl p-4 lg:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Video Call
                    {isInCall && (
                        <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            {peers.size + 1} connected
                        </span>
                    )}
                </h3>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {!isInCall ? (
                // Join call button
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-slate-400 mb-4">Join video call to see other participants</p>
                    <button onClick={startCall} className="btn-primary">
                        Join Video Call
                    </button>
                </div>
            ) : (
                <>
                    {/* Video Grid */}
                    <div className="video-grid mb-4">
                        {/* Local Video */}
                        <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className={`w-full h-full object-cover ${isCameraOff ? "hidden" : ""}`}
                            />
                            {isCameraOff && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                                You {isMuted && "🔇"}
                            </div>
                        </div>

                        {/* Remote Videos */}
                        {Array.from(peers.entries()).map(([socketId, peer]) => (
                            <div key={socketId} className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden">
                                {peer.stream ? (
                                    <video
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                        ref={(el) => {
                                            if (el && peer.stream) {
                                                el.srcObject = peer.stream;

                                                 el.play().catch(() => {});
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse"></div>
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                                    {peer.username}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={toggleMute}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMuted ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                )}
                            </svg>
                        </button>

                        <button
                            onClick={toggleCamera}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isCameraOff ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isCameraOff ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                )}
                            </svg>
                        </button>

                        <button
                            onClick={endCall}
                            className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                            title="Leave call"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                            </svg>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
