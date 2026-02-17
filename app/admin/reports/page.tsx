'use client';
import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

interface ReportEntry {
    user: {
        id: string;
        username: string;
        name: string;
        avatarUrl: string | null;
        blocked: boolean;
        suspendedUntil: string | null;
    };
    totalReports: number;
    maxSeverity: string;
    severityCounts: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
    latestReason: string;
    latestReport: string;
    reports: Array<{
        id: string;
        reason: string;
        severity: string;
        createdAt: string;
        reporter: { username: string };
    }>;
}

export default function AdminReportsPage() {
    const [reports, setReports] = useState<ReportEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/reports')
            .then(r => r.json())
            .then(data => { setReports(data.reports || []); setLoading(false); });
    }, []);

    const getSeverityBadge = (severity: string) => {
        const map: Record<string, string> = {
            LOW: styles.badgeLow,
            MEDIUM: styles.badgeMedium,
            HIGH: styles.badgeHigh,
            CRITICAL: styles.badgeCritical,
        };
        return map[severity] || '';
    };

    return (
        <div>
            <h1 className={styles.pageTitle}>Reports</h1>
            <p className={styles.pageSubtitle}>Users reported by the community</p>

            {loading ? (
                <p style={{ color: '#666' }}>Loading reports...</p>
            ) : reports.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>✅</span>
                    <p>No reports yet — all clear!</p>
                </div>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Reported User</th>
                            <th>Total Reports</th>
                            <th>Max Severity</th>
                            <th>Severity Breakdown</th>
                            <th>Latest Reason</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(entry => (
                            <>
                                <tr key={entry.user.id} onClick={() => setExpanded(expanded === entry.user.id ? null : entry.user.id)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div className={styles.userCell}>
                                            <img
                                                src={entry.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user.username}`}
                                                alt={entry.user.name}
                                                className={styles.userAvatar}
                                            />
                                            <div>
                                                <div className={styles.userName}>{entry.user.name}</div>
                                                <div className={styles.userEmail}>@{entry.user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.reportCount} style={{ color: entry.totalReports >= 20 ? '#ef4444' : '#f59e0b' }}>
                                            {entry.totalReports}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${getSeverityBadge(entry.maxSeverity)}`}>
                                            {entry.maxSeverity}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {entry.severityCounts.CRITICAL > 0 && <span style={{ color: '#ef4444', marginRight: 8 }}>🔴 {entry.severityCounts.CRITICAL}</span>}
                                        {entry.severityCounts.HIGH > 0 && <span style={{ color: '#f97316', marginRight: 8 }}>🟠 {entry.severityCounts.HIGH}</span>}
                                        {entry.severityCounts.MEDIUM > 0 && <span style={{ color: '#eab308', marginRight: 8 }}>🟡 {entry.severityCounts.MEDIUM}</span>}
                                        {entry.severityCounts.LOW > 0 && <span style={{ color: '#22c55e' }}>🟢 {entry.severityCounts.LOW}</span>}
                                    </td>
                                    <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>
                                        {entry.latestReason}
                                    </td>
                                    <td>
                                        {entry.user.blocked ? (
                                            <span className={`${styles.badge} ${styles.badgeBlocked}`}>Blocked</span>
                                        ) : entry.user.suspendedUntil && new Date(entry.user.suspendedUntil) > new Date() ? (
                                            <span className={`${styles.badge} ${styles.badgeSuspended}`}>Suspended</span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
                                        )}
                                    </td>
                                </tr>
                                {expanded === entry.user.id && (
                                    <tr key={`${entry.user.id}-details`}>
                                        <td colSpan={6} style={{ padding: '0 14px 16px', background: 'rgba(255,255,255,0.01)' }}>
                                            <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Recent Reports (last 10)</div>
                                            {entry.reports.map(r => (
                                                <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 13 }}>
                                                    <span className={`${styles.badge} ${getSeverityBadge(r.severity)}`} style={{ marginRight: 8 }}>{r.severity}</span>
                                                    <span style={{ color: '#aaa' }}>{r.reason}</span>
                                                    <span style={{ color: '#555', marginLeft: 12, fontSize: 11 }}>
                                                        by @{r.reporter.username} · {new Date(r.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
