import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import styles from './layout.module.css';
import IncomingCallBanner from '@/components/IncomingCallBanner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId');
    if (!userId) redirect('/auth/login');

    return (
        <div className={styles.container}>
            <IncomingCallBanner />
            <nav className={styles.nav}>
                <Link href="/dashboard" className={styles.logo}>SecretChat</Link>
                <div className={styles.actions}>
                    <Link href="/" className={styles.navLink}>Logout</Link>
                </div>
            </nav>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
