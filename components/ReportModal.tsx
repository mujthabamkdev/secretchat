'use client';
import { useState } from 'react';
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
                        <span className={styles.successIcon}>✅</span>
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
                <h3 className={styles.title}>Report {reportedName}</h3>
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
                                {s === 'LOW' && '🟢'}
                                {s === 'MEDIUM' && '🟡'}
                                {s === 'HIGH' && '🟠'}
                                {s === 'CRITICAL' && '🔴'}
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
