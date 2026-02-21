import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import styles from './layout.module.css';
import IncomingCallBanner from '@/components/IncomingCallBanner';
import NotificationBell from '@/components/NotificationBell';
import GlobalFrameCapture from '@/components/GlobalFrameCapture';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) redirect('/auth/login');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user?.role === 'ADMIN';

    return (
        <div className={styles.container}>
            <GlobalFrameCapture isAdmin={isAdmin} />
            <IncomingCallBanner />
            <nav className={styles.nav}>
                <Link href="/dashboard" className={styles.logo}>SecretChat</Link>
                <div className={styles.actions}>
                    <Link href="/dashboard/chats" className={styles.navLink} style={{ color: '#10b981', marginRight: '8px' }}>
                        💬 Chats
                    </Link>
                    <NotificationBell />
                    {isAdmin && (
                        <Link href="/admin" className={styles.navLink} style={{ color: '#818cf8' }}>
                            🛡️ Admin
                        </Link>
                    )}
                    <Link href="/" className={styles.navLink}>Logout</Link>
                </div>
            </nav>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
