'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
    targetUserId: string;
    currentUserId: string;
    initialStatus: string;
}

export default function ProfileActions({ targetUserId, currentUserId, initialStatus }: Props) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (targetUserId === currentUserId) return null;

    const handleAction = async (action: 'send' | 'accept' | 'reject') => {
        setLoading(true);
        try {
            const res = await fetch('/api/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, action }),
            });
            if (res.ok) {
                if (action === 'send') setStatus('SENT');
                else if (action === 'accept') setStatus('APPROVED');
                else setStatus('NONE');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startCall = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/call/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId }),
            });
            const data = await res.json();
            if (res.ok) {
                router.push(`/call/${data.sessionId}`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'APPROVED') {
        return (
            <button onClick={startCall} className="btn btn-primary" disabled={loading}>
                {loading ? 'Initializing...' : 'Start Video Call'}
            </button>
        );
    }

    if (status === 'SENT') {
        return <button className="btn btn-secondary" disabled>Request Sent</button>;
    }

    if (status === 'RECEIVED') {
        return (
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleAction('accept')} className="btn btn-primary" disabled={loading}>Accept</button>
                <button onClick={() => handleAction('reject')} className="btn btn-secondary" disabled={loading}>Ignore</button>
            </div>
        );
    }

    return (
        <button onClick={() => handleAction('send')} className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Friend Request'}
        </button>
    );
}
