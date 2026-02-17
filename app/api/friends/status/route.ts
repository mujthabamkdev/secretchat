import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET /api/friends/status?userId=xxx — check relationship status with another user
export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ status: 'NONE' });

        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get('userId');
        if (!targetUserId) return NextResponse.json({ status: 'NONE' });

        const request = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId: currentUserId, receiverId: targetUserId },
                    { senderId: targetUserId, receiverId: currentUserId },
                ],
            },
        });

        if (!request) return NextResponse.json({ status: 'NONE' });

        if (request.status === 'BLOCKED') {
            return NextResponse.json({ status: request.senderId === currentUserId ? 'BLOCKED' : 'NONE' });
        }
        if (request.status === 'APPROVED') return NextResponse.json({ status: 'APPROVED' });
        if (request.senderId === currentUserId) return NextResponse.json({ status: 'SENT' });
        return NextResponse.json({ status: 'RECEIVED' });
    } catch {
        return NextResponse.json({ status: 'NONE' });
    }
}
