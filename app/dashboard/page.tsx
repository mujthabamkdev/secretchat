import prisma from '@/lib/prisma';
import styles from './page.module.css';
import Link from 'next/link';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const query = (await searchParams).q || '';
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { username: { contains: query } },
                { name: { contains: query } },
            ],
        },
        take: 50,
    });

    return (
        <div className="container">
            <header className={styles.header}>
                <h1 className="heading">Secret Network</h1>
                <p className="subheading">Find verified users and start a secret connection.</p>
            </header>

            <form className={styles.searchForm}>
                <input type="text" name="q" placeholder="Search by name or username..." className="input" defaultValue={query} />
            </form>

            <div className={styles.userList}>
                {users.map((user) => (
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
