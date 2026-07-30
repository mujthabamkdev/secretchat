import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET /api/topics/[id]/comments - List comments for a topic
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: topicId } = await params;

        const topic = await prisma.topic.findUnique({
            where: { id: topicId },
            select: { authorId: true, commentsRestricted: true }
        });

        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        const comments = await prisma.topicComment.findMany({
            where: { topicId },
            orderBy: { createdAt: 'asc' },
            include: {
                author: { select: { id: true, username: true, name: true, avatarUrl: true } }
            }
        });

        return NextResponse.json({
            comments: comments.map(c => ({
                id: c.id,
                content: c.content,
                createdAt: c.createdAt,
                author: c.author,
                isCommentAuthor: c.author.id === userId,
                isTopicAuthor: topic.authorId === userId
            })),
            commentsRestricted: topic.commentsRestricted,
            isTopicAuthor: topic.authorId === userId
        });
    } catch (error) {
        console.error('Fetch topic comments error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/topics/[id]/comments - Add a comment to a topic
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: topicId } = await params;
        const { content } = await req.json();

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
        }

        const topic = await prisma.topic.findUnique({
            where: { id: topicId },
            select: { authorId: true, commentsRestricted: true }
        });

        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        if (topic.commentsRestricted && topic.authorId !== userId) {
            return NextResponse.json({ error: 'Commenting is restricted by the topic author' }, { status: 403 });
        }

        const comment = await prisma.topicComment.create({
            data: {
                topicId,
                authorId: userId,
                content: content.trim()
            },
            include: {
                author: { select: { id: true, username: true, name: true, avatarUrl: true } }
            }
        });

        const commentsCount = await prisma.topicComment.count({ where: { topicId } });

        return NextResponse.json({
            comment: {
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                author: comment.author,
                isCommentAuthor: true,
                isTopicAuthor: topic.authorId === userId
            },
            commentsCount
        });
    } catch (error) {
        console.error('Create comment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
