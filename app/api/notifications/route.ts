import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [pendingRequests, missedCalls, topicLikes, topicComments] = await Promise.all([
            // Pending friend requests received
            prisma.friendRequest.findMany({
                where: { receiverId: userId, status: 'PENDING' },
                include: { sender: { select: { id: true, username: true, name: true, avatarUrl: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            // Missed calls
            prisma.callSession.findMany({
                where: {
                    participant2Id: userId,
                    status: 'ENDED',
                    OR: [
                        { endedAt: null },
                    ],
                },
                include: {
                    participant1: { select: { id: true, username: true, name: true, avatarUrl: true } },
                },
                orderBy: { startedAt: 'desc' },
                take: 20,
            }),
            // Likes on user's topics
            prisma.topicLike.findMany({
                where: {
                    topic: { authorId: userId },
                    userId: { not: userId }
                },
                include: {
                    user: { select: { id: true, username: true, name: true, avatarUrl: true } },
                    topic: { select: { id: true, content: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            // Comments on user's topics
            prisma.topicComment.findMany({
                where: {
                    topic: { authorId: userId },
                    authorId: { not: userId }
                },
                include: {
                    author: { select: { id: true, username: true, name: true, avatarUrl: true } },
                    topic: { select: { id: true, content: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            })
        ]);

        // Filter missed calls: calls shorter than 10 seconds
        const missed = missedCalls.filter(c => {
            if (!c.endedAt) return true;
            const duration = (new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000;
            return duration < 10;
        }).slice(0, 10);

        const notifications = [
            ...pendingRequests.map(r => ({
                id: r.id,
                type: 'friend_request' as const,
                user: r.sender,
                time: r.createdAt.toISOString(),
            })),
            ...missed.map(c => ({
                id: c.id,
                type: 'missed_call' as const,
                user: c.participant1,
                time: c.startedAt.toISOString(),
            })),
            ...topicLikes.map(l => ({
                id: `like-${l.id}`,
                type: 'topic_like' as const,
                user: l.user,
                topicId: l.topic.id,
                time: l.createdAt.toISOString(),
            })),
            ...topicComments.map(c => ({
                id: `comment-${c.id}`,
                type: 'topic_comment' as const,
                user: c.author,
                topicId: c.topic.id,
                time: c.createdAt.toISOString(),
            })),
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return NextResponse.json({ notifications, count: notifications.length });
    } catch (error) {
        console.error('Notifications error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
