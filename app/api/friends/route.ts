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
            // Check if blocked
            const blocked = await prisma.friendRequest.findFirst({
                where: {
                    OR: [
                        { senderId: currentUserId, receiverId: targetUserId, status: 'BLOCKED' },
                        { senderId: targetUserId, receiverId: currentUserId, status: 'BLOCKED' },
                    ],
                },
            });
            if (blocked) return NextResponse.json({ error: 'Cannot send request' }, { status: 403 });

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
        } else if (action === 'reject' || action === 'cancel' || action === 'unfriend') {
            // All three delete the friend request record
            await prisma.friendRequest.deleteMany({
                where: {
                    OR: [
                        { senderId: currentUserId, receiverId: targetUserId },
                        { senderId: targetUserId, receiverId: currentUserId },
                    ],
                },
            });
        } else if (action === 'block') {
            // Delete any existing request first, then create a BLOCKED record
            await prisma.friendRequest.deleteMany({
                where: {
                    OR: [
                        { senderId: currentUserId, receiverId: targetUserId },
                        { senderId: targetUserId, receiverId: currentUserId },
                    ],
                },
            });
            await prisma.friendRequest.create({
                data: { senderId: currentUserId, receiverId: targetUserId, status: 'BLOCKED' },
            });
        } else if (action === 'unblock') {
            await prisma.friendRequest.deleteMany({
                where: { senderId: currentUserId, receiverId: targetUserId, status: 'BLOCKED' },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
