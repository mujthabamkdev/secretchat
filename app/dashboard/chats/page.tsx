import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import Link from 'next/link';
import styles from '../page.module.css';

export default async function ChatsPage() {
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('userId')?.value;

    if (!currentUserId) return null;

    // Fetch approved connections
    const connections = await prisma.friendRequest.findMany({
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
    });

    const chatsList = await Promise.all(connections.map(async conn => {
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

    // Sort by most recent message first, then fallback to those without messages
    chatsList.sort((a, b) => {
        if (!a.latestMessage && !b.latestMessage) return 0;
        if (!a.latestMessage) return 1;
        if (!b.latestMessage) return -1;
        return new Date(b.latestMessage.sentAt).getTime() - new Date(a.latestMessage.sentAt).getTime();
    });

    return (
        <div className="container" style={{ padding: '20px' }}>
            <h1 className="heading" style={{ marginBottom: '24px' }}>Chats</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chatsList.length === 0 && (
                    <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
                        No connections yet. Add friends to start chatting!
                    </p>
                )}
                {chatsList.map((chat: any) => (
                    <Link
                        href={`/dashboard/chat/${chat.id}`}
                        key={chat.id}
                        className={styles.userCard}
                        style={{
                            display: 'flex', alignItems: 'center', padding: '16px',
                            textDecoration: 'none', transition: 'all 0.2s', borderColor: 'var(--border)'
                        }}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', marginRight: '16px', background: '#262626', flexShrink: 0 }}>
                            <img src={chat.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.username}`} alt={chat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.name}</div>
                                {chat.latestMessage && (
                                    <div style={{ fontSize: '0.7rem', color: '#6b7280', flexShrink: 0, marginLeft: '8px' }}>
                                        {new Date(chat.latestMessage.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </div>
                                )}
                            </div>
                            <div style={{
                                fontSize: '0.85rem', color: chat.latestMessage && !chat.latestMessage.readAt && chat.latestMessage.senderId !== currentUserId ? '#10b981' : '#888',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px', fontStyle: chat.latestMessage?.type.includes('EPHEMERAL') ? 'italic' : 'normal',
                                fontWeight: chat.latestMessage && !chat.latestMessage.readAt && chat.latestMessage.senderId !== currentUserId ? 'bold' : 'normal'
                            }}>
                                {chat.latestMessage
                                    ? (chat.latestMessage.type.includes('EPHEMERAL') ? '🔥 Disappearing message' : (chat.latestMessage.content || 'Media message'))
                                    : 'Start a conversation...'}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
