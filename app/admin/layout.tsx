import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldCheck, BarChart2, Users, AlertTriangle, Lock, ArrowLeft } from 'lucide-react';
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
                <div className={styles.sidebarHeader} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={24} color="#14b8a6" />
                    <h2 className={styles.sidebarTitle} style={{ margin: 0 }}>Admin Panel</h2>
                </div>
                <nav className={styles.sidebarNav}>
                    <Link href="/admin" className={styles.navItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={18} /> Overview
                    </Link>
                    <Link href="/admin/users" className={styles.navItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} /> Users
                    </Link>
                    <Link href="/admin/reports" className={styles.navItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} /> Reports
                    </Link>
                    <Link href="/admin/review" className={styles.navItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={18} /> Blocked Review
                    </Link>
                </nav>
                <div className={styles.sidebarFooter}>
                    <Link href="/dashboard" className={styles.backLink} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowLeft size={16} /> Back to App
                    </Link>
                </div>
            </aside>
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
