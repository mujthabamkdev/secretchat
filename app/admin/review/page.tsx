'use client';
import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

interface BlockedUser {
    id: string;
    username: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    _count: { reportsReceived: number };
}

export default function AdminReviewPage() {
    const [users, setUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchBlocked = async () => {
        const res = await fetch('/api/admin/users?search=');
        const data = await res.json();
        // Filter to only blocked users
        const blocked = (data.users || []).filter((u: any) => u.blocked);
        setUsers(blocked);
        setLoading(false);
    };

    useEffect(() => { fetchBlocked(); }, []);

    const handleAction = async (userId: string, action: string) => {
        setActionLoading(userId);
        await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        });
        setActionLoading(null);
        fetchBlocked();
    };

    return (
        <div>
            <h1 className={styles.pageTitle}>Blocked Users Review</h1>
            <p className={styles.pageSubtitle}>Users with 500+ reports auto-blocked and pending your review</p>

            {loading ? (
                <p style={{ color: '#666' }}>Loading...</p>
            ) : users.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🎉</span>
                    <p>No blocked users to review</p>
                </div>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Reports</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className={styles.userCell}>
                                        <img
                                            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                            alt={user.name}
                                            className={styles.userAvatar}
                                        />
                                        <div>
                                            <div className={styles.userName}>{user.name}</div>
                                            <div className={styles.userEmail}>@{user.username} · {user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={styles.reportCount} style={{ color: '#ef4444' }}>
                                        {user._count.reportsReceived}
                                    </span>
                                </td>
                                <td>
                                    {actionLoading === user.id ? (
                                        <span style={{ color: '#666', fontSize: 12 }}>Processing...</span>
                                    ) : (
                                        <>
                                            <button onClick={() => handleAction(user.id, 'unblock')} className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}>
                                                Unblock
                                            </button>
                                            <button onClick={() => handleAction(user.id, 'revoke')} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
                                                Permanently Revoke
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
