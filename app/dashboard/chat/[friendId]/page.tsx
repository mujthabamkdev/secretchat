import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import ChatRoom from '@/components/chat/ChatRoom';

export default async function ChatPage({ params }: { params: Promise<{ friendId: string }> }) {
    const { friendId } = await params;
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('userId')?.value;

    if (!currentUserId) redirect('/');

    const friend = await prisma.user.findUnique({
        where: { id: friendId },
        select: { id: true, name: true, username: true, avatarUrl: true },
    });

    if (!friend) notFound();

    // Verify friendship status to allow chatting
    const request = await prisma.friendRequest.findFirst({
        where: {
            OR: [
                { senderId: currentUserId, receiverId: friendId },
                { senderId: friendId, receiverId: currentUserId },
            ],
        },
    });

    if (!request || request.status !== 'APPROVED') {
        // Can only message approved friends
        // You might want to allow it anyway for "message requests", but we'll restrict it here
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '100px', color: '#888' }}>
                <h2>You must be friends to chat.</h2>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0a0a' }}>
            {/* Header */}
            <header style={{
                display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #222',
                background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10
            }}>
                <a href="/dashboard" style={{ marginRight: '16px', color: '#10b981', textDecoration: 'none', fontSize: '24px' }}>
                    &larr;
                </a>
                <img
                    src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`}
                    alt={friend.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }}
                />
                <div>
                    <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#fff' }}>{friend.name}</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>@{friend.username}</p>
                </div>
            </header>

            {/* Chat Room */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <ChatRoom currentUserId={currentUserId} friendId={friend.id} friendName={friend.name} />
            </div>
        </div>
    );
}
