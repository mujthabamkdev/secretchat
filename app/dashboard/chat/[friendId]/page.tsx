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
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            width: '100vw',
            height: '100dvh',
            background: '#090d16',
            overflow: 'hidden',
            zIndex: 99
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid #1e293b',
                background: 'rgba(9, 13, 22, 0.95)',
                backdropFilter: 'blur(12px)',
                flexShrink: 0
            }}>
                <a href="/dashboard" style={{ marginRight: '16px', color: '#14b8a6', textDecoration: 'none', fontSize: '20px', display: 'flex', alignItems: 'center' }} title="Back to Dashboard">
                    &larr;
                </a>
                <a href={`/dashboard/profile/${friend.id}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }} title={`View ${friend.name}'s profile`}>
                    <img
                        src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`}
                        alt={friend.name}
                        style={{ width: '38px', height: '38px', borderRadius: '50%', marginRight: '12px', border: '1px solid #1e293b', objectFit: 'cover' }}
                    />
                    <div>
                        <h2 style={{ fontSize: '1rem', margin: 0, color: '#f8fafc', fontWeight: 700, lineHeight: 1.2 }}>{friend.name}</h2>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>@{friend.username}</p>
                    </div>
                </a>
            </header>

            {/* Chat Room Container */}
            <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <ChatRoom currentUserId={currentUserId} friendId={friend.id} friendName={friend.name} />
            </div>
        </div>
    );
}
