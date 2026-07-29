import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
    return (
        <main className={styles.main}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/icons/icon-192.png" alt="SecretChat Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                    <span>SecretChat</span>
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
                    Private Audio Calls,{' '}
                    <span className={styles.gradientText}>Reimagined.</span>
                </h1>

                <p className={styles.heroSub}>
                    Connect with people you trust through secure, zero-knowledge encrypted audio calls & secret messaging.
                    No tracking. No ads. Just real conversations.
                </p>

                <div className={styles.heroCta}>
                    <Link href="/auth/register" className={styles.ctaPrimary}>
                        Create Free Account →
                    </Link>
                    <Link href="/auth/login" className={styles.ctaSecondary}>
                        Sign In
                    </Link>
                </div>
            </section>

            {/* Feature Cards */}
            <div className={styles.features}>
                <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>🛡️</span>
                    <div className={styles.featureTitle}>Gmail Verified</div>
                    <p className={styles.featureDesc}>
                        Every account is verified through Gmail OTP — keeping the network authentic and spam-free.
                    </p>
                </div>
                <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>📹</span>
                    <div className={styles.featureTitle}>Private Video Calls</div>
                    <p className={styles.featureDesc}>
                        Connect face-to-face with your trusted circle. No recordings, no third-party access.
                    </p>
                </div>
                <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>👥</span>
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
