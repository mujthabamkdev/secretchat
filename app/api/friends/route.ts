import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { targetUserId, action } = await req.json();

        if (action === 'send') {
            await prisma.friendRequest.upsert({
                where: { senderId_receiverId: { senderId: currentUserId, receiverId: targetUserId } },
                update: { status: 'PENDING' },
                create: { senderId: currentUserId, receiverId: targetUserId, status: 'PENDING' },
            });
        } else if (action === 'accept') {
            await prisma.friendRequest.updateMany({
                where: {
                    OR: [
                        { senderId: currentUserId, receiverId: targetUserId },
                        { senderId: targetUserId, receiverId: currentUserId },
                    ],
                },
                data: { status: 'APPROVED' },
            });
        } else if (action === 'reject') {
            await prisma.friendRequest.deleteMany({
                where: {
                    OR: [
                        { senderId: currentUserId, receiverId: targetUserId },
                        { senderId: targetUserId, receiverId: currentUserId },
                    ],
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
