import prisma from '@/lib/prisma';
import styles from './page.module.css';
import Link from 'next/link';
import { cookies } from 'next/headers';
import ClientSearch from './ClientSearch';

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


    // Fetch friends (connections)
    const connections = currentUserId ? await prisma.friendRequest.findMany({
        where: {
            OR: [
                { senderId: currentUserId, status: 'APPROVED' },
                { receiverId: currentUserId, status: 'APPROVED' }
            ]
        },
        include: {
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
            receiver: { select: { id: true, name: true, username: true, avatarUrl: true } }
        }
    }) : [];

    const friends = await Promise.all(connections.map(async conn => {
        const friend = conn.senderId === currentUserId ? conn.receiver : conn.sender;

        // Find latest message between currentUserId and friend.id
        const latestMessage = await prisma.message.findFirst({
            where: {
                conversation: {
                    AND: [
                        { participants: { some: { id: currentUserId } } },
                        { participants: { some: { id: friend.id } } }
                    ]
                }
            },
            orderBy: { sentAt: 'desc' }
        });

        return { ...friend, latestMessage };
    }));

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

            <div className={styles.searchWrapper}>
                <ClientSearch initialQuery={query} />
            </div>

            {/* Friends Section */}
            {friends.length > 0 && (
                <div className={styles.friendsSection}>
                    <h2 className={styles.sectionTitle} style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1rem', marginTop: '2rem' }}>My Connections</h2>
                    <div className={styles.userList}>
                        {friends.map((friend: any) => (
                            <div key={friend.id} className={styles.userCard} style={{ borderColor: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Link href={`/dashboard/profile/${friend.id}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flex: 1, minWidth: 0, paddingRight: '12px' }}>
                                    <div className={styles.avatar}>
                                        <img src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} alt={friend.name} />
                                    </div>
                                    <div className={styles.userInfo} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className={styles.userName}>{friend.name}</div>
                                            {friend.latestMessage && (
                                                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                                    {new Date(friend.latestMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.userHandle}>@{friend.username}</div>
                                        <div style={{
                                            fontSize: '0.8rem', color: friend.latestMessage && !friend.latestMessage.readAt && friend.latestMessage.senderId !== currentUserId ? '#10b981' : '#888',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px', fontStyle: friend.latestMessage?.type.includes('EPHEMERAL') ? 'italic' : 'normal',
                                            fontWeight: friend.latestMessage && !friend.latestMessage.readAt && friend.latestMessage.senderId !== currentUserId ? 'bold' : 'normal'
                                        }}>
                                            {friend.latestMessage
                                                ? (friend.latestMessage.type.includes('EPHEMERAL') ? '🔥 Disappearing message' : (friend.latestMessage.content || 'Media message'))
                                                : 'Start a conversation'}
                                        </div>
                                    </div>
                                </Link>
                                <Link
                                    href={`/dashboard/chat/${friend.id}`}
                                    style={{
                                        padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                        borderRadius: '8px', fontSize: '1.2rem', textDecoration: 'none', transition: 'all 0.2s'
                                    }}
                                    title="Go to Chat"
                                >
                                    💬
                                </Link>
                            </div>
                        ))}
                    </div>
                    <hr style={{ borderColor: '#333', margin: '2rem 0' }} />
                </div>
            )}

            <h2 className={styles.sectionTitle} style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1rem' }}>Community</h2>
            <div className={styles.userList}>
                {users.filter((u: any) => !friends.find(f => f.id === u.id)).map((user: any) => (
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
