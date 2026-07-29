import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MessageSquare, LogOut } from 'lucide-react';
import prisma from '@/lib/prisma';
import styles from './layout.module.css';
import IncomingCallBanner from '@/components/IncomingCallBanner';
import NotificationBell from '@/components/NotificationBell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) redirect('/auth/login');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, avatarUrl: true, username: true } });
    const profileAvatar = user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'default'}`;

    return (
        <div className={styles.container}>
            <IncomingCallBanner />
            <nav className={styles.nav}>
                <Link href="/dashboard" className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/icons/icon-192.png" alt="SecretChat" style={{ width: '28px', height: '28px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(20, 184, 166, 0.25)' }} />
                    <span style={{ fontFamily: "var(--font-outfit), 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 900, letterSpacing: '-0.6px', fontSize: '19px', color: '#ffffff' }}>
                        SecretChat
                    </span>
                </Link>
                <div className={styles.actions} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/dashboard/chats" className={styles.navLink} style={{ color: '#14b8a6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageSquare size={18} /> Chats
                    </Link>
                    <NotificationBell />
                </div>
            </nav>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
