'use client';
import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

interface User {
    id: string;
    username: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    blocked: boolean;
    suspendedUntil: string | null;
    createdAt: string;
    _count: { reportsReceived: number };
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchUsers = async () => {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
        const data = await res.json();
        setUsers(data.users || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, [search]);

    const handleAction = async (userId: string, action: string) => {
        if (action === 'revoke' && !confirm('Permanently delete this user and all their data?')) return;
        setActionLoading(userId);
        await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        });
        setActionLoading(null);
        fetchUsers();
    };

    const getStatus = (user: User) => {
        if (user.blocked) return { label: 'Blocked', class: styles.badgeBlocked };
        if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) return { label: 'Suspended', class: styles.badgeSuspended };
        if (user.role === 'ADMIN') return { label: 'Admin', class: styles.badgeAdmin };
        return { label: 'Active', class: styles.badgeActive };
    };

    return (
        <div>
            <h1 className={styles.pageTitle}>Users</h1>
            <p className={styles.pageSubtitle}>Manage all registered users</p>

            <div className={styles.searchBar}>
                <input
                    type="text"
                    placeholder="Search by username, email, or name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {loading ? (
                <p style={{ color: '#666' }}>Loading users...</p>
            ) : users.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>👥</span>
                    <p>No users found</p>
                </div>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Status</th>
                            <th>Reports</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => {
                            const status = getStatus(user);
                            return (
                                <tr key={user.id}>
                                    <td>
                                        <a href={`/dashboard/profile/${user.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                                        </a>
                                    </td>
                                    <td><span className={`${styles.badge} ${status.class}`}>{status.label}</span></td>
                                    <td>
                                        <span className={styles.reportCount} style={{ color: user._count.reportsReceived > 0 ? '#ef4444' : '#666' }}>
                                            {user._count.reportsReceived}
                                        </span>
                                    </td>
                                    <td style={{ color: '#666', fontSize: 13 }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        {actionLoading === user.id ? (
                                            <span style={{ color: '#666', fontSize: 12 }}>Processing...</span>
                                        ) : (
                                            <>
                                                {user.blocked ? (
                                                    <button onClick={() => handleAction(user.id, 'unblock')} className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}>Unblock</button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handleAction(user.id, 'suspend')} className={styles.actionBtn}>Suspend</button>
                                                        <button onClick={() => handleAction(user.id, 'block')} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Block</button>
                                                    </>
                                                )}
                                                <button onClick={() => handleAction(user.id, 'revoke')} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Revoke</button>
                                                {user.role !== 'ADMIN' && (
                                                    <button onClick={() => handleAction(user.id, 'makeAdmin')} className={styles.actionBtn}>Make Admin</button>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
