'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './IncomingCall.module.css';

interface IncomingCall {
    id: string;
    participant1: {
        name: string;
        username: string;
        avatarUrl: string | null;
    };
}

export default function IncomingCallBanner() {
    const router = useRouter();
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
    const [responding, setResponding] = useState(false);

    // Poll for incoming calls every 3 seconds
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch('/api/call/session');
                const data = await res.json();
                if (data.incomingCall) {
                    setIncomingCall(data.incomingCall);
                } else {
                    setIncomingCall(null);
                }
            } catch (e) { }
        };

        check();
        const interval = setInterval(check, 3000);
        return () => clearInterval(interval);
    }, []);

    const acceptCall = async () => {
        if (!incomingCall) return;
        setResponding(true);
        try {
            await fetch('/api/call/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: incomingCall.id, action: 'accept' }),
            });
            router.push(`/call/${incomingCall.id}`);
        } catch (e) {
            console.error(e);
            setResponding(false);
        }
    };

    const declineCall = async () => {
        if (!incomingCall) return;
        setResponding(true);
        try {
            await fetch('/api/call/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: incomingCall.id, action: 'end' }),
            });
            setIncomingCall(null);
        } catch (e) {
            console.error(e);
        } finally {
            setResponding(false);
        }
    };

    if (!incomingCall) return null;

    const callerAvatar = incomingCall.participant1.avatarUrl
        || `https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingCall.participant1.username}`;

    return (
        <div className={styles.banner}>
            <div className={styles.bannerContent}>
                <div className={styles.callerInfo}>
                    <div className={styles.callerAvatar}>
                        <img src={callerAvatar} alt={incomingCall.participant1.name} />
                        <div className={styles.pulseRing} />
                    </div>
                    <div>
                        <div className={styles.callerName}>{incomingCall.participant1.name}</div>
                        <div className={styles.callerLabel}>Incoming video call...</div>
                    </div>
                </div>
                <div className={styles.actions}>
                    <button
                        onClick={declineCall}
                        className={styles.declineBtn}
                        disabled={responding}
                    >
                        ✕
                    </button>
                    <button
                        onClick={acceptCall}
                        className={styles.acceptBtn}
                        disabled={responding}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
