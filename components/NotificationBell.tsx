'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, User, PhoneCall, ChevronRight } from 'lucide-react';
import styles from './NotificationBell.module.css';

interface NotifUser {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
}

interface Notification {
    id: string;
    type: 'friend_request' | 'missed_call';
    user: NotifUser;
    time: string;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            setNotifications(data.notifications || []);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 8000);

        // Listen for broadcasts from ProfileActions
        const bc = new BroadcastChannel('friend-actions');
        bc.onmessage = () => fetchNotifications();

        return () => {
            clearInterval(interval);
            bc.close();
        };
    }, []);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const timeAgo = (time: string) => {
        const diff = (Date.now() - new Date(time).getTime()) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const count = notifications.length;

    return (
        <div className={styles.wrapper} ref={ref}>
            <button className={styles.bellBtn} onClick={() => setOpen(!open)} title="Notifications" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={19} />
                {count > 0 && <span className={styles.badge}>{count > 9 ? '9+' : count}</span>}
            </button>

            {open && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                        <span>Notifications</span>
                        {count > 0 && <span className={styles.countLabel}>{count}</span>}
                    </div>

                    {notifications.length === 0 ? (
                        <div className={styles.empty}>No new notifications</div>
                    ) : (
                        <div className={styles.list}>
                            {notifications.map(n => (
                                <a
                                    key={n.id}
                                    href={`/dashboard/profile/${n.user.id}`}
                                    className={styles.item}
                                    onClick={() => setOpen(false)}
                                >
                                    <img
                                        src={n.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.user.username}`}
                                        alt={n.user.name}
                                        className={styles.avatar}
                                    />
                                    <div className={styles.content}>
                                        <div className={styles.text}>
                                            <strong>{n.user.name}</strong>
                                            {n.type === 'friend_request'
                                                ? ' sent you a friend request'
                                                : ' missed call'}
                                        </div>
                                        <div className={styles.time} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {n.type === 'friend_request' ? <User size={12} color="#14b8a6" /> : <PhoneCall size={12} color="#ef4444" />}
                                            <span>{timeAgo(n.time)}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className={styles.arrow} />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
