'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportModal from './ReportModal';
import ConfirmDialog from './ConfirmDialog';

interface Props {
    targetUserId: string;
    targetUserName: string;
    currentUserId: string;
    initialStatus: string;
}

interface ConfirmState {
    action: string;
    title: string;
    message: string;
    confirmLabel: string;
}

export default function ProfileActions({ targetUserId, targetUserName, currentUserId, initialStatus }: Props) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const router = useRouter();

    if (targetUserId === currentUserId) return null;

    const handleAction = async (action: string) => {
        setLoading(true);
        setConfirmState(null);
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

                // Broadcast so NotificationBell refreshes instantly
                try { new BroadcastChannel('friend-actions').postMessage('changed'); } catch { }
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
            if (res.ok) router.push(`/call/${data.sessionId}`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const showConfirm = (action: string, title: string, message: string, confirmLabel: string) => {
        setConfirmState({ action, title, message, confirmLabel });
    };

    const actionBtn = (label: string, action: string, title: string, message: string, confirmLabel: string) => (
        <button
            onClick={() => showConfirm(action, title, message, confirmLabel)}
            disabled={loading}
            style={{
                padding: '6px 14px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)', color: '#888',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            }}
        >
            {label}
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
                            <button onClick={() => setShowReport(true)} style={{
                                padding: '6px 14px', borderRadius: '8px',
                                border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                                color: '#ef4444', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                            }}>⚠️ Report</button>
                            {actionBtn('💔 Unfriend', 'unfriend', 'Unfriend', `Remove ${targetUserName} from your friends? You won't be able to call them.`, 'Unfriend')}
                            {actionBtn('🚫 Block', 'block', 'Block User', `Block ${targetUserName}? They won't be able to contact you.`, 'Block')}
                        </div>
                    </>
                )}

                {status === 'SENT' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => showConfirm('cancel', 'Cancel Request', `Cancel your friend request to ${targetUserName}?`, 'Cancel Request')}
                            className="btn btn-secondary" disabled={loading}
                        >✕ Cancel Request</button>
                        {actionBtn('🚫 Block', 'block', 'Block User', `Block ${targetUserName}? They won't be able to contact you.`, 'Block')}
                    </div>
                )}

                {status === 'RECEIVED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleAction('accept')} className="btn btn-primary" disabled={loading}>Accept</button>
                            <button onClick={() => handleAction('reject')} className="btn btn-secondary" disabled={loading}>Ignore</button>
                        </div>
                        {actionBtn('🚫 Block', 'block', 'Block User', `Block ${targetUserName}? They won't be able to contact you.`, 'Block')}
                    </div>
                )}

                {status === 'NONE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => handleAction('send')} className="btn btn-primary" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Friend Request'}
                        </button>
                        {actionBtn('🚫 Block', 'block', 'Block User', `Block ${targetUserName}? They won't be able to contact you.`, 'Block')}
                    </div>
                )}

                {status === 'BLOCKED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>🚫 You have blocked this user</p>
                        <button
                            onClick={() => handleAction('unblock')} disabled={loading}
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
                <ReportModal reportedId={targetUserId} reportedName={targetUserName} onClose={() => setShowReport(false)} />
            )}

            {confirmState && (
                <ConfirmDialog
                    title={confirmState.title}
                    message={confirmState.message}
                    confirmLabel={confirmState.confirmLabel}
                    danger={true}
                    onConfirm={() => handleAction(confirmState.action)}
                    onCancel={() => setConfirmState(null)}
                />
            )}
        </>
    );
}
