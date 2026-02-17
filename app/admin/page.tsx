import prisma from '@/lib/prisma';
import styles from './admin.module.css';

export default async function AdminOverview() {
    const [totalUsers, totalReports, suspendedUsers, blockedUsers] = await Promise.all([
        prisma.user.count(),
        prisma.report.count(),
        prisma.user.count({ where: { suspendedUntil: { gt: new Date() } } }),
        prisma.user.count({ where: { blocked: true } }),
    ]);

    return (
        <div>
            <h1 className={styles.pageTitle}>Dashboard Overview</h1>
            <p className={styles.pageSubtitle}>Monitor your platform at a glance</p>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Users</div>
                    <div className={`${styles.statValue} ${styles.statAccent}`}>{totalUsers}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Reports</div>
                    <div className={styles.statValue}>{totalReports}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Suspended</div>
                    <div className={`${styles.statValue} ${styles.statWarning}`}>{suspendedUsers}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Blocked</div>
                    <div className={`${styles.statValue} ${styles.statDanger}`}>{blockedUsers}</div>
                </div>
            </div>
        </div>
    );
}
