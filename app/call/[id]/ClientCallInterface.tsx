'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import ReportModal from '@/components/ReportModal';
import { getOrGenerateLocalKeyPair, importPublicKey, deriveSharedKey, encryptText, decryptText } from '@/lib/crypto';

interface Props {
    sessionId: string;
    otherUser: { id: string; name: string; username: string; avatarUrl: string | null };
    isCaller: boolean;
    initialStatus: string;
    isAdmin?: boolean;
}

type CallState = 'permission' | 'connecting' | 'active';

const SERVERS = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

export default function ClientCallInterface({ sessionId, otherUser, isCaller, initialStatus }: Props) {
    const router = useRouter();
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);     // Local media stream (audio + video)
    const pcRef = useRef<RTCPeerConnection | null>(null);   // WebRTC connection
    const ringtoneRef = useRef<AudioContext | null>(null);
    const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const sharedKeyRef = useRef<CryptoKey | null>(null);

    // Signaling state
    const lastSignalIdRef = useRef<string>('');
    const hasProcessedOffer = useRef(false);
    const hasProcessedAnswer = useRef(false);

    const [callState, setCallState] = useState<CallState>('permission');
    const [permissionState, setPermissionState] = useState<'requesting' | 'denied' | 'granted'>('requesting');
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [connectingDots, setConnectingDots] = useState('');
    const [showReport, setShowReport] = useState(false);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [callSharedKey, setCallSharedKey] = useState<CryptoKey | null>(null);

    const otherAvatar = otherUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`;

    // ── E2EE Setup for Signaling ──
    useEffect(() => {
        const initCallE2EE = async () => {
            try {
                const cookieId = document.cookie.split('userId=')[1]?.split(';')[0];
                if (!cookieId) return;
                const { keyPair, publicKeyString } = await getOrGenerateLocalKeyPair(cookieId);
                
                await fetch('/api/user/key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ publicKey: publicKeyString })
                });

                const keyRes = await fetch(`/api/user/key?userId=${otherUser.id}`);
                if (keyRes.ok) {
                    const keyData = await keyRes.json();
                    if (keyData.publicKey) {
                        const peerPubKey = await importPublicKey(keyData.publicKey);
                        const derived = await deriveSharedKey(keyPair.privateKey, peerPubKey);
                        setCallSharedKey(derived);
                        sharedKeyRef.current = derived;
                    }
                }
            } catch (e) {
                console.error('Call E2EE key error:', e);
            }
        };
        initCallE2EE();
    }, [otherUser.id]);

    // ── Call Duration Counter ──
    useEffect(() => {
        if (callState !== 'active') return;
        const interval = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [callState]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ── Ringing sound via Web Audio API ──
    const startRinging = useCallback(() => {
        try {
            const ctx = new AudioContext();
            ringtoneRef.current = ctx;

            const playRingTone = () => {
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.frequency.value = 440;
                osc1.type = 'sine';
                gain1.gain.setValueAtTime(0.15, ctx.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(ctx.currentTime);
                osc1.stop(ctx.currentTime + 0.4);

                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.frequency.value = 494;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.5);
                gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(ctx.currentTime + 0.5);
                osc2.stop(ctx.currentTime + 0.9);
            };

            playRingTone();
            ringtoneIntervalRef.current = setInterval(playRingTone, 2000);
        } catch (e) {
            console.error('Could not start ringtone', e);
        }
    }, []);

    const stopRinging = useCallback(() => {
        if (ringtoneIntervalRef.current) {
            clearInterval(ringtoneIntervalRef.current);
            ringtoneIntervalRef.current = null;
        }
        if (ringtoneRef.current) {
            ringtoneRef.current.close().catch(() => { });
            ringtoneRef.current = null;
        }
    }, []);

    // Send encrypted or plain signal payload helper
    const sendSignalPayload = useCallback(async (type: string, rawPayload: any) => {
        let payload = rawPayload;
        let iv: string | null = null;

        if (sharedKeyRef.current) {
            try {
                const enc = await encryptText(JSON.stringify(rawPayload), sharedKeyRef.current);
                payload = enc.ciphertext;
                iv = enc.iv;
            } catch (e) {
                console.error('Signal encryption error:', e);
            }
        }

        await fetch('/api/call/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                type,
                payload,
                iv
            }),
        });
    }, [sessionId]);

    // ── WebRTC Setup ──
    const setupWebRTC = useCallback(async () => {
        if (pcRef.current) return; // Already setup

        console.log('[WebRTC] Setting up Audio/Video PeerConnection...');
        const pc = new RTCPeerConnection(SERVERS);
        pcRef.current = pc;

        // Add local video & audio tracks to PC
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, streamRef.current!);
            });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            console.log('[WebRTC] Remote media track received:', event.streams[0]);
            const remote = event.streams[0];
            setRemoteStream(remote);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remote;
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await sendSignalPayload('ICE', event.candidate.toJSON());
            }
        };

        // If Caller, create Offer
        if (isCaller) {
            console.log('[WebRTC] Creating Offer...');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignalPayload('OFFER', { type: offer.type, sdp: offer.sdp });
        }
    }, [isCaller, sendSignalPayload]);

    // ── Signal Polling ──
    useEffect(() => {
        if (callState === 'permission') return;

        let polling = true;
        const pollSignals = async () => {
            if (!polling || !pcRef.current) return;

            try {
                const url = `/api/call/signal?sessionId=${sessionId}&lastSignalId=${lastSignalIdRef.current}`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.signals && data.signals.length > 0) {
                    for (const signal of data.signals) {
                        lastSignalIdRef.current = signal.id;
                        const pc = pcRef.current;

                        let payload = signal.payload;
                        if (signal.iv && sharedKeyRef.current) {
                            try {
                                const decrypted = await decryptText(signal.payload, signal.iv, sharedKeyRef.current);
                                payload = JSON.parse(decrypted);
                            } catch (e) {
                                console.error('Signal decryption error:', e);
                            }
                        }

                        if (signal.type === 'OFFER' && !isCaller && !hasProcessedOffer.current) {
                            console.log('[WebRTC] Received Offer');
                            hasProcessedOffer.current = true;
                            await pc.setRemoteDescription(new RTCSessionDescription(payload));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);

                            await sendSignalPayload('ANSWER', { type: answer.type, sdp: answer.sdp });
                        }
                        else if (signal.type === 'ANSWER' && isCaller && !hasProcessedAnswer.current) {
                            console.log('[WebRTC] Received Answer');
                            hasProcessedAnswer.current = true;
                            await pc.setRemoteDescription(new RTCSessionDescription(payload));
                        }
                        else if (signal.type === 'ICE') {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(payload));
                            } catch (e) {
                                console.error('Error adding received ice candidate', e);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Signal poll error:', err);
            }

            if (polling) setTimeout(pollSignals, 2000);
        };

        if (pcRef.current) {
            pollSignals();
        }

        return () => { polling = false; };
    }, [callState, sessionId, isCaller, sendSignalPayload]);

    // ── Request camera & microphone access ──
    const requestPermission = useCallback(async () => {
        setPermissionState('requesting');
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: true
            });

            streamRef.current = s;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = s;
            }
            setPermissionState('granted');

            await setupWebRTC();

            if (!isCaller && initialStatus === 'ACTIVE') {
                setCallState('active');
            } else {
                setCallState('connecting');
            }
        } catch (err) {
            console.error('Camera/microphone access denied', err);
            setPermissionState('denied');
        }
    }, [isCaller, initialStatus, setupWebRTC]);

    useEffect(() => { requestPermission(); }, [requestPermission]);

    // Cleanup stream and ringtone on unmount
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
            stopRinging();
            pcRef.current?.close();
        };
    }, [stopRinging]);

    // ── Connecting dots animation ──
    useEffect(() => {
        if (callState !== 'connecting') return;
        const interval = setInterval(() => {
            setConnectingDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, [callState]);

    // ── Ringing + polling for call acceptance (CALLER only) ──
    useEffect(() => {
        if (callState !== 'connecting') return;

        if (isCaller) startRinging();

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/call/session?sessionId=${sessionId}`);
                const data = await res.json();
                if (data.status === 'ACTIVE') {
                    stopRinging();
                    setCallState('active');
                } else if (data.status === 'ENDED') {
                    stopRinging();
                    streamRef.current?.getTracks().forEach(track => track.stop());
                    router.replace(`/dashboard/profile/${otherUser.id}`);
                }
            } catch (e) {
                console.error('Poll error', e);
            }
        }, 2000);

        return () => {
            clearInterval(pollInterval);
            stopRinging();
        };
    }, [callState, sessionId, isCaller, startRinging, stopRinging, router]);

    // ── Attach streams to video elements ──
    useEffect(() => {
        if (streamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
        }
    }, [callState]);

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, callState]);

    // ── Disconnect detection during active call ──
    useEffect(() => {
        if (callState !== 'active') return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/call/session?sessionId=${sessionId}`);
                const data = await res.json();
                if (data.status === 'ENDED') {
                    streamRef.current?.getTracks().forEach(track => track.stop());
                    pcRef.current?.close();
                    router.replace(`/dashboard/profile/${otherUser.id}`);
                }
            } catch (e) { }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [callState, sessionId, router]);

    const endCall = async () => {
        stopRinging();
        try {
            await fetch('/api/call/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, action: 'end' }),
            });
        } catch (e) { }
        streamRef.current?.getTracks().forEach(track => track.stop());
        pcRef.current?.close();
        router.replace(`/dashboard/profile/${otherUser.id}`);
    };

    // Handle tab close
    useEffect(() => {
        const handleUnload = () => {
            stopRinging();
            navigator.sendBeacon(
                '/api/call/session',
                new Blob(
                    [JSON.stringify({ sessionId, action: 'end' })],
                    { type: 'application/json' }
                )
            );
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [sessionId, stopRinging]);

    const toggleMic = () => {
        const audioTrack = streamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setMicOn(audioTrack.enabled);
        }
    };

    const toggleCamera = () => {
        const videoTrack = streamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setCameraOn(videoTrack.enabled);
        }
    };

    // ── Permission Screen ──
    if (callState === 'permission') {
        return (
            <div className={styles.container}>
                <div className={styles.permissionOverlay}>
                    <div className={styles.permissionCard}>
                        <div className={styles.permissionIcon}>
                            {permissionState === 'requesting' ? '📹' : '🚫'}
                        </div>
                        <h2 className={styles.permissionTitle}>
                            {permissionState === 'requesting'
                                ? 'Requesting Access...'
                                : 'Camera & Microphone Required'}
                        </h2>
                        <p className={styles.permissionText}>
                            {permissionState === 'requesting'
                                ? 'SecretChat is securing your camera & audio connection...'
                                : 'Please allow camera and microphone access to start your video call.'}
                        </p>
                        {permissionState === 'denied' && (
                            <button onClick={requestPermission} className={styles.retryButton}>Try Again</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Connecting / Ringing Screen ──
    if (callState === 'connecting') {
        return (
            <div className={styles.container}>
                <div className={styles.connectingScreen}>
                    <div className={styles.connectingRipple}>
                        <div className={styles.ripple1} />
                        <div className={styles.ripple2} />
                        <div className={styles.ripple3} />
                        <div className={styles.connectingAvatar}>
                            <img src={otherAvatar} alt={otherUser.name} />
                        </div>
                    </div>
                    <h2 className={styles.connectingName}>{otherUser.name}</h2>
                    <p className={styles.connectingStatus}>
                        {isCaller ? `Calling${connectingDots}` : `Connecting${connectingDots}`}
                    </p>
                    <div className={styles.controls} style={{ marginTop: 40 }}>
                        <button onClick={endCall} className={styles.endButton} title="End Call">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Active Video Call Screen (100% Zero-Tracking WebRTC Video) ──
    return (
        <div className={styles.container}>
            {/* Main Remote Video View */}
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={styles.remoteVideo}
            />

            {/* Picture-in-Picture Local Video View */}
            <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={styles.localVideo}
            />

            <div className={styles.status}>
                {callSharedKey ? '🔒 E2EE Video Call' : '🔒 Secure Video Call'} · {formatDuration(callDuration)}
            </div>

            <div className={styles.controls}>
                <button
                    onClick={toggleMic}
                    className={`${styles.controlButton} ${!micOn ? styles.controlOff : ''}`}
                    title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                    {micOn ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" /></svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.3,11.74 17.3,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5V11L15,11.16M4.27,3L3,4.27L9.01,10.28V11A3,3 0 0,0 12.01,14C12.22,14 12.42,13.97 12.62,13.92L14.43,15.73C13.68,16.12 12.87,16.37 12,16.5V21H11V16.5C7.72,15.97 5.15,13.17 5.15,10.5H6.85C6.85,12.79 8.72,14.66 11,14.96L11.45,14.96L17.73,21.23L19,19.97L4.27,3Z" /></svg>
                    )}
                </button>

                <button
                    onClick={toggleCamera}
                    className={`${styles.controlButton} ${!cameraOn ? styles.controlOff : ''}`}
                    title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                    {cameraOn ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z" /></svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M3.27,2L2,3.27L4.73,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16.73L19.73,21L21,19.73L3.27,2M17,10.5L21,6.5V14.31L17,10.31V10.5M16,6A1,1 0 0,1 17,7V8.18L14.82,6H16Z" /></svg>
                    )}
                </button>

                <button onClick={endCall} className={styles.endButton} title="End Call">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                    </svg>
                </button>

                <button
                    onClick={() => setShowReport(true)}
                    className={styles.controlButton}
                    title="Report User"
                    style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444"><path d="M1,21H23L12,2L1,21M13,18H11V16H13V18M13,14H11V10H13V14Z" /></svg>
                </button>
            </div>

            {showReport && (
                <ReportModal
                    reportedId={otherUser.id}
                    reportedName={otherUser.name}
                    onClose={() => setShowReport(false)}
                />
            )}
        </div>
    );
}
