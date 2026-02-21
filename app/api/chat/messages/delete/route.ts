import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
    try {
        const { messageId } = await req.json();
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;

        if (!currentUserId || !messageId) {
            return NextResponse.json({ error: 'Unauthorized or missing data' }, { status: 400 });
        }

        const message = await prisma.message.findUnique({
            where: { id: messageId }
        });

        if (!message) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        if (message.senderId !== currentUserId) {
            return NextResponse.json({ error: 'Unauthorized bounds' }, { status: 403 });
        }

        await prisma.message.delete({
            where: { id: messageId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete message error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
