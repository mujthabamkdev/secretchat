'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface Props {
    sessionId: string;
    otherUser: { name: string; username: string; avatarUrl: string | null };
}

export default function ClientCallInterface({ sessionId, otherUser }: Props) {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturing, setCapturing] = useState(false);

    useEffect(() => {
        async function startCamera() {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(s);
                if (videoRef.current) videoRef.current.srcObject = s;
                setCapturing(true);
            } catch (err) {
                console.error("Camera access failed", err);
            }
        }
        startCamera();

        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (capturing) {
            interval = setInterval(async () => {
                if (!videoRef.current) return;
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
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
                                console.error("Frame upload failed", e);
                            }
                        }
                    }, 'image/jpeg', 0.5);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [capturing, sessionId]);

    const endCall = async () => {
        try {
            await fetch('/api/call/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, action: 'end' }),
            });
        } catch (e) { }
        stream?.getTracks().forEach(track => track.stop());
        router.replace('/dashboard');
    };

    useEffect(() => {
        const handleUnload = () => {
            const data = JSON.stringify({ sessionId, action: 'end' });
            navigator.sendBeacon('/api/call/session', data);
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [sessionId]);

    return (
        <div className={styles.container}>
            <div className={styles.status}>Secure Link Active</div>
            <div className={styles.videoGrid}>
                <div className={styles.videoContainer}>
                    {stream ? (
                        <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
                    ) : (
                        <div className={styles.placeholder} style={{ background: '#222' }}>Connecting camera...</div>
                    )}
                    <div className={styles.label}>You</div>
                </div>
                <div className={styles.videoContainer}>
                    <div className={styles.placeholder}>
                        <img src={otherUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`} alt={otherUser.name} />
                    </div>
                    <div className={styles.label}>{otherUser.name}</div>
                </div>
            </div>
            <div className={styles.controls}>
                <button onClick={endCall} className={styles.endButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
