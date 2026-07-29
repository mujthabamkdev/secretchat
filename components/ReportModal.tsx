'use client';
import { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import styles from './ReportModal.module.css';

interface Props {
    reportedId: string;
    reportedName: string;
    onClose: () => void;
}

export default function ReportModal({ reportedId, reportedName, onClose }: Props) {
    const [reason, setReason] = useState('');
    const [severity, setSeverity] = useState('MEDIUM');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportedId, reason, severity }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit report');
            }
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    <div className={styles.success}>
                        <div className={styles.successIcon} style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#10b981' }}>
                            <CheckCircle2 size={48} />
                        </div>
                        <h3>Report Submitted</h3>
                        <p>Thank you for helping keep SecretChat safe.</p>
                        <button onClick={onClose} className={styles.closeBtn}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <ShieldAlert size={22} color="#f59e0b" />
                    <h3 className={styles.title} style={{ margin: 0 }}>Report {reportedName}</h3>
                </div>
                <p className={styles.subtitle}>Help us understand what happened</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <label className={styles.label}>Severity</label>
                    <div className={styles.severityGrid}>
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                            <button
                                key={s}
                                type="button"
                                className={`${styles.severityBtn} ${styles[`severity${s}`]} ${severity === s ? styles.severityActive : ''}`}
                                onClick={() => setSeverity(s)}
                            >
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: s === 'LOW' ? '#22c55e' : s === 'MEDIUM' ? '#eab308' : s === 'HIGH' ? '#f97316' : '#ef4444',
                                    display: 'inline-block'
                                }} />
                                <span>{s}</span>
                            </button>
                        ))}
                    </div>

                    <label className={styles.label}>Reason</label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className={styles.textarea}
                        placeholder="Describe the issue..."
                        rows={4}
                        required
                    />

                    <div className={styles.actions}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={loading || !reason.trim()} className={styles.submitBtn}>
                            {loading ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
