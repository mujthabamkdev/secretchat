'use client';
import { useState, useEffect, useMemo } from 'react';
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

type SortField = 'name' | 'status' | 'reports' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchLoading, setBatchLoading] = useState(false);

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

    const handleBatchAction = async (action: string) => {
        if (selectedIds.size === 0) return;
        if (action === 'revoke' && !confirm(`Permanently delete ${selectedIds.size} selected users and all their data?`)) return;

        setBatchLoading(true);
        try {
            await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: Array.from(selectedIds), action }),
            });
            setSelectedIds(new Set());
            fetchUsers();
        } catch (e) {
            console.error(e);
        } finally {
            setBatchLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sortedUsers.length && sortedUsers.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedUsers.map(u => u.id)));
        }
    };

    const toggleSelectUser = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getStatus = (user: User) => {
        if (user.email === 'secretchatreal@gmail.com') return { label: 'Super Admin', class: styles.badgeAdmin, order: -1 };
        if (user.blocked) return { label: 'Blocked', class: styles.badgeBlocked, order: 3 };
        if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) return { label: 'Suspended', class: styles.badgeSuspended, order: 2 };
        if (user.role === 'ADMIN') return { label: 'Admin', class: styles.badgeAdmin, order: 0 };
        return { label: 'Active', class: styles.badgeActive, order: 1 };
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedUsers = useMemo(() => {
        return [...users].sort((a, b) => {
            let valA: any = a[sortField as keyof User];
            let valB: any = b[sortField as keyof User];

            if (sortField === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortField === 'status') {
                valA = getStatus(a).order;
                valB = getStatus(b).order;
            } else if (sortField === 'reports') {
                valA = a._count.reportsReceived;
                valB = b._count.reportsReceived;
            } else if (sortField === 'createdAt') {
                valA = new Date(a.createdAt).getTime();
                valB = new Date(b.createdAt).getTime();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [users, sortField, sortOrder]);

    const renderSortIndicator = (field: SortField) => {
        if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
        return <span style={{ marginLeft: 4 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    };

    const allSelected = sortedUsers.length > 0 && selectedIds.size === sortedUsers.length;

    return (
        <div>
            <h1 className={styles.pageTitle}>Users</h1>
            <p className={styles.pageSubtitle}>Manage all registered users</p>

            <div className={styles.searchBar} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Search by username, email, or name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={styles.searchInput}
                    style={{ flex: 1, minWidth: '220px' }}
                />
            </div>

            {/* Batch Action Toolbar */}
            {selectedIds.size > 0 && (
                <div style={{
                    background: 'rgba(20, 184, 166, 0.1)',
                    border: '1px solid rgba(20, 184, 166, 0.3)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#14b8a6' }}>
                        ✓ {selectedIds.size} user{selectedIds.size > 1 ? 's' : ''} selected
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button disabled={batchLoading} onClick={() => handleBatchAction('suspend')} className={styles.actionBtn}>
                            Suspend ({selectedIds.size})
                        </button>
                        <button disabled={batchLoading} onClick={() => handleBatchAction('block')} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
                            Block ({selectedIds.size})
                        </button>
                        <button disabled={batchLoading} onClick={() => handleBatchAction('unblock')} className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}>
                            Unblock ({selectedIds.size})
                        </button>
                        <button disabled={batchLoading} onClick={() => handleBatchAction('makeAdmin')} className={styles.actionBtn}>
                            Make Admin ({selectedIds.size})
                        </button>
                        <button disabled={batchLoading} onClick={() => handleBatchAction('revoke')} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
                            Revoke ({selectedIds.size})
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <p style={{ color: '#666' }}>Loading users...</p>
            ) : sortedUsers.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>👥</span>
                    <p>No users found</p>
                </div>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    style={{ cursor: 'pointer', accentColor: '#14b8a6' }}
                                />
                            </th>
                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                User {renderSortIndicator('name')}
                            </th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Status {renderSortIndicator('status')}
                            </th>
                            <th onClick={() => handleSort('reports')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Reports {renderSortIndicator('reports')}
                            </th>
                            <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Joined {renderSortIndicator('createdAt')}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map(user => {
                            const status = getStatus(user);
                            const isSelected = selectedIds.has(user.id);
                            const isSuperAdmin = user.email === 'secretchatreal@gmail.com';

                            return (
                                <tr key={user.id} style={{ background: isSelected ? 'rgba(20, 184, 166, 0.05)' : undefined }}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={isSuperAdmin}
                                            onChange={() => !isSuperAdmin && toggleSelectUser(user.id)}
                                            style={{ cursor: isSuperAdmin ? 'not-allowed' : 'pointer', accentColor: '#14b8a6', opacity: isSuperAdmin ? 0.3 : 1 }}
                                        />
                                    </td>
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
                                        {isSuperAdmin ? (
                                            <span style={{ color: '#14b8a6', fontSize: 12, fontWeight: 600 }}>🔒 Protected Super Admin</span>
                                        ) : actionLoading === user.id ? (
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
