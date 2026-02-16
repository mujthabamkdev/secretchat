import prisma from '@/lib/prisma';
import styles from './page.module.css';
import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const query = (await searchParams).q || '';
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('userId')?.value;

    const currentUser = currentUserId
        ? await prisma.user.findUnique({ where: { id: currentUserId }, select: { avatarUrl: true, username: true } })
        : null;

    const users = await prisma.user.findMany({
        where: {
            AND: [
                currentUserId ? { id: { not: currentUserId } } : {},
                {
                    OR: [
                        { username: { contains: query, mode: 'insensitive' } },
                        { name: { contains: query, mode: 'insensitive' } },
                    ],
                },
            ],
        },
        take: 50,
    });

    const profileAvatar = currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'default'}`;

    return (
        <div className="container">
            <header className={styles.header}>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className="heading">Secret Network</h1>
                        <p className="subheading">Find verified users and start a secret connection.</p>
                    </div>
                    <Link href="/dashboard/settings" className={styles.profileButton} title="Profile Settings">
                        <img src={profileAvatar} alt="Profile" />
                    </Link>
                </div>
            </header>

            <form className={styles.searchForm}>
                <input type="text" name="q" placeholder="Search by name or username..." className="input" defaultValue={query} />
            </form>

            <div className={styles.userList}>
                {users.map((user: any) => (
                    <Link href={`/dashboard/profile/${user.id}`} key={user.id} className={styles.userCard}>
                        <div className={styles.avatar}>
                            <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.name} />
                        </div>
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>{user.name}</div>
                            <div className={styles.userHandle}>@{user.username}</div>
                        </div>
                        <div className={styles.chevron}>→</div>
                    </Link>
                ))}
                {users.length === 0 && <p style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>No users found.</p>}
            </div>
        </div>
    );
}
