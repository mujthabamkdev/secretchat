import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldCheck, Video, Users, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

export default async function Home() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (userId) {
        redirect('/dashboard');
    }

    return (
        <main className={styles.main}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.logo}>
                    <img src="/icons/icon-192.png" alt="SecretChat Logo" style={{ width: '30px', height: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(20, 184, 166, 0.3)' }} />
                    <span className={styles.logoText}>SecretChat</span>
                </div>
                <div className={styles.navLinks}>
                    <Link href="/auth/login" className={styles.navLink}>Login</Link>
                    <Link href="/auth/register" className={`${styles.navLink} ${styles.navLinkPrimary}`}>
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className={styles.hero}>
                <div className={styles.badge}>
                    <span className={styles.badgeDot} />
                    End-to-end encrypted
                </div>

                <h1 className={styles.heroTitle}>
                    Private Communication,{' '}
                    <span className={styles.gradientText}>Reimagined.</span>
                </h1>

                <p className={styles.heroSub}>
                    Connect with people you trust through secure, zero-knowledge encrypted audio calls & secret messaging.
                    No tracking. No ads. Just real conversations.
                </p>

                <div className={styles.heroCta}>
                    <Link href="/auth/register" className={styles.ctaPrimary}>
                        Create Free Account <ArrowRight size={18} />
                    </Link>
                    <Link href="/auth/login" className={styles.ctaSecondary}>
                        Sign In
                    </Link>
                </div>
            </section>

            {/* Feature Cards */}
            <div className={styles.features}>
                <div className={styles.featureCard}>
                    <div className={styles.featureIconContainer} style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(20, 184, 166, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#14b8a6', marginBottom: '16px' }}>
                        <ShieldCheck size={24} />
                    </div>
                    <div className={styles.featureTitle}>Gmail Verified</div>
                    <p className={styles.featureDesc}>
                        Every account is verified through Gmail OTP — keeping the network authentic and spam-free.
                    </p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIconContainer} style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '16px' }}>
                        <Video size={24} />
                    </div>
                    <div className={styles.featureTitle}>Private Video Calls</div>
                    <p className={styles.featureDesc}>
                        Connect face-to-face with your trusted circle. No recordings, no third-party access.
                    </p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIconContainer} style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', marginBottom: '16px' }}>
                        <Users size={24} />
                    </div>
                    <div className={styles.featureTitle}>Invite Only Network</div>
                    <p className={styles.featureDesc}>
                        Build your private network through friend requests. You decide who gets access.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className={styles.footer}>
                © 2026 SecretChat · Privacy First
            </footer>
        </main>
    );
}
