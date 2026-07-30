import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// POST /api/topics/[id]/like - Toggle like on a topic
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: topicId } = await params;

        const topic = await prisma.topic.findUnique({
            where: { id: topicId },
            select: { authorId: true }
        });

        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        const existing = await prisma.topicLike.findUnique({
            where: {
                topicId_userId: { topicId, userId }
            }
        });

        let isLiked = false;
        if (existing) {
            await prisma.topicLike.delete({
                where: { id: existing.id }
            });
            isLiked = false;
        } else {
            await prisma.topicLike.create({
                data: { topicId, userId }
            });
            isLiked = true;
        }

        const likesCount = await prisma.topicLike.count({ where: { topicId } });

        return NextResponse.json({ success: true, isLiked, likesCount });
    } catch (error) {
        console.error('Topic like error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
