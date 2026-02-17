'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportModal from './ReportModal';

interface Props {
    targetUserId: string;
    targetUserName: string;
    currentUserId: string;
    initialStatus: string; // NONE, SENT, RECEIVED, APPROVED, BLOCKED
}

export default function ProfileActions({ targetUserId, targetUserName, currentUserId, initialStatus }: Props) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [confirmAction, setConfirmAction] = useState<string | null>(null);
    const router = useRouter();

    if (targetUserId === currentUserId) return null;

    const handleAction = async (action: string) => {
        setLoading(true);
        setConfirmAction(null);
        try {
            const res = await fetch('/api/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, action }),
            });
            if (res.ok) {
                if (action === 'send') setStatus('SENT');
                else if (action === 'accept') setStatus('APPROVED');
                else if (action === 'block') setStatus('BLOCKED');
                else if (action === 'unblock') setStatus('NONE');
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

    const dangerBtn = (label: string, action: string, icon: string) => (
        <button
            onClick={() => confirmAction === action ? handleAction(action) : setConfirmAction(action)}
            disabled={loading}
            style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: `1px solid ${confirmAction === action ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                background: confirmAction === action ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                color: confirmAction === action ? '#ef4444' : '#888',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
            }}
        >
            {icon} {confirmAction === action ? `Confirm ${label}?` : label}
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
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowReport(true)}
                                style={{
                                    padding: '6px 14px', borderRadius: '8px',
                                    border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                                    color: '#ef4444', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                }}
                            >⚠️ Report</button>
                            {dangerBtn('Unfriend', 'unfriend', '💔')}
                            {dangerBtn('Block', 'block', '🚫')}
                        </div>
                    </>
                )}

                {status === 'SENT' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <button className="btn btn-secondary" disabled style={{ opacity: 0.6 }}>
                            ⏳ Request Sent
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {dangerBtn('Cancel Request', 'cancel', '✕')}
                            {dangerBtn('Block', 'block', '🚫')}
                        </div>
                    </div>
                )}

                {status === 'RECEIVED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleAction('accept')} className="btn btn-primary" disabled={loading}>Accept</button>
                            <button onClick={() => handleAction('reject')} className="btn btn-secondary" disabled={loading}>Ignore</button>
                        </div>
                        {dangerBtn('Block', 'block', '🚫')}
                    </div>
                )}

                {status === 'NONE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => handleAction('send')} className="btn btn-primary" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Friend Request'}
                        </button>
                        {dangerBtn('Block', 'block', '🚫')}
                    </div>
                )}

                {status === 'BLOCKED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>🚫 You have blocked this user</p>
                        <button
                            onClick={() => handleAction('unblock')}
                            disabled={loading}
                            style={{
                                padding: '8px 20px', borderRadius: '10px',
                                border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)',
                                color: '#22c55e', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                            }}
                        >Unblock</button>
                    </div>
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
