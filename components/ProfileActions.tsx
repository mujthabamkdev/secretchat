'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportModal from './ReportModal';

interface Props {
    targetUserId: string;
    targetUserName: string;
    currentUserId: string;
    initialStatus: string;
}

export default function ProfileActions({ targetUserId, targetUserName, currentUserId, initialStatus }: Props) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const [showReport, setShowReport] = useState(false);
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

    const reportButton = (
        <button
            onClick={() => setShowReport(true)}
            style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
            }}
        >
            ⚠️ Report
        </button>
    );

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                {status === 'APPROVED' && (
                    <>
                        <button onClick={startCall} className="btn btn-primary" disabled={loading}>
                            {loading ? 'Initializing...' : 'Start Video Call'}
                        </button>
                        {reportButton}
                    </>
                )}
                {status === 'SENT' && (
                    <button className="btn btn-secondary" disabled>Request Sent</button>
                )}
                {status === 'RECEIVED' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleAction('accept')} className="btn btn-primary" disabled={loading}>Accept</button>
                        <button onClick={() => handleAction('reject')} className="btn btn-secondary" disabled={loading}>Ignore</button>
                    </div>
                )}
                {status === 'NONE' && (
                    <button onClick={() => handleAction('send')} className="btn btn-primary" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Friend Request'}
                    </button>
                )}
            </div>

            {showReport && (
                <ReportModal
                    reportedId={targetUserId}
                    reportedName={targetUserName}
                    onClose={() => setShowReport(false)}
                />
            )}
        </>
    );
}
