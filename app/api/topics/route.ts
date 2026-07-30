import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET /api/topics - List all topics with pagination/cursor ordering by createdAt DESC (newest at top)
export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get('cursor');
        const limit = 10;

        const topics = await prisma.topic.findMany({
            take: limit + 1,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { id: true, username: true, name: true, avatarUrl: true } },
                likes: { select: { userId: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });

        let nextCursor: string | null = null;
        if (topics.length > limit) {
            const nextItem = topics.pop();
            nextCursor = nextItem?.id || null;
        }

        const formattedTopics = topics.map(topic => {
            const isLiked = topic.likes.some(l => l.userId === userId);
            return {
                id: topic.id,
                author: topic.author,
                content: topic.content,
                commentsRestricted: topic.commentsRestricted,
                createdAt: topic.createdAt,
                likesCount: topic._count.likes,
                commentsCount: topic._count.comments,
                isLiked,
                isAuthor: topic.author.id === userId
            };
        });

        return NextResponse.json({ topics: formattedTopics, nextCursor });
    } catch (error) {
        console.error('Fetch topics error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/topics - Create a new topic
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
            return NextResponse.json({ error: 'User session invalid. Please log in again.' }, { status: 401 });
        }

        const { content, commentsRestricted = false } = await req.json();

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'Topic content cannot be empty' }, { status: 400 });
        }

        const topic = await prisma.topic.create({
            data: {
                authorId: userId,
                content: content.trim(),
                commentsRestricted: Boolean(commentsRestricted)
            },
            include: {
                author: { select: { id: true, username: true, name: true, avatarUrl: true } },
                likes: { select: { userId: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });

        return NextResponse.json({
            topic: {
                id: topic.id,
                author: topic.author,
                content: topic.content,
                commentsRestricted: topic.commentsRestricted,
                createdAt: topic.createdAt,
                likesCount: 0,
                commentsCount: 0,
                isLiked: false,
                isAuthor: true
            }
        });
    } catch (error: any) {
        console.error('Create topic error:', error);
        return NextResponse.json({ error: error?.message || 'Failed to post topic. Please try again.' }, { status: 500 });
    }
}
