import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// DELETE /api/topics/[id]/comments/[commentId] - Delete comment (comment author, topic author, or ADMIN)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: topicId, commentId } = await params;

        const comment = await prisma.topicComment.findUnique({
            where: { id: commentId },
            include: { topic: { select: { authorId: true } } }
        });

        if (!comment || comment.topicId !== topicId) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        const isCommentAuthor = comment.authorId === userId;
        const isTopicAuthor = comment.topic.authorId === userId;
        const isAdmin = user?.role === 'ADMIN';

        if (!isCommentAuthor && !isTopicAuthor && !isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.topicComment.delete({ where: { id: commentId } });

        const commentsCount = await prisma.topicComment.count({ where: { topicId } });

        return NextResponse.json({ success: true, commentsCount });
    } catch (error) {
        console.error('Delete comment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
