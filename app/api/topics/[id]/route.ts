import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// DELETE /api/topics/[id] - Delete a topic (only author or ADMIN)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const topic = await prisma.topic.findUnique({
            where: { id },
            select: { authorId: true }
        });

        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (topic.authorId !== userId && user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.topic.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete topic error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/topics/[id] - Restrict or unrestrict comments for author
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const { commentsRestricted } = await req.json();

        const topic = await prisma.topic.findUnique({
            where: { id },
            select: { authorId: true }
        });

        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        if (topic.authorId !== userId) {
            return NextResponse.json({ error: 'Only author can restrict commenting' }, { status: 403 });
        }

        const updated = await prisma.topic.update({
            where: { id },
            data: { commentsRestricted: Boolean(commentsRestricted) }
        });

        return NextResponse.json({ success: true, commentsRestricted: updated.commentsRestricted });
    } catch (error) {
        console.error('Update topic restriction error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
