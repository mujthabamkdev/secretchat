import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import styles from './admin.module.css';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) redirect('/auth/login');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } });
    if (user?.role !== 'ADMIN') redirect('/dashboard');

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <span className={styles.sidebarLogo}>🛡️</span>
                    <h2 className={styles.sidebarTitle}>Admin</h2>
                </div>
                <nav className={styles.sidebarNav}>
                    <Link href="/admin" className={styles.navItem}>
                        <span>📊</span> Overview
                    </Link>
                    <Link href="/admin/users" className={styles.navItem}>
                        <span>👥</span> Users
                    </Link>
                    <Link href="/admin/frames" className={styles.navItem}>
                        <span>📸</span> Global Frames
                    </Link>
                    <Link href="/admin/reports" className={styles.navItem}>
                        <span>🚨</span> Reports
                    </Link>
                    <Link href="/admin/review" className={styles.navItem}>
                        <span>🔒</span> Blocked Review
                    </Link>
                </nav>
                <div className={styles.sidebarFooter}>
                    <Link href="/dashboard" className={styles.backLink}>← Back to App</Link>
                </div>
            </aside>
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
