'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff } from 'lucide-react';
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
                        <PhoneOff size={18} />
                    </button>
                    <button
                        onClick={acceptCall}
                        className={styles.acceptBtn}
                        disabled={responding}
                    >
                        <Phone size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
