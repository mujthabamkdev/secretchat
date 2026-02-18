import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;

        if (!currentUserId) {
            return NextResponse.json({ activeSessionId: null });
        }

        const activeSession = await prisma.callSession.findFirst({
            where: {
                OR: [
                    { participant1Id: currentUserId },
                    { participant2Id: currentUserId }
                ],
                status: { in: ['RINGING', 'ACTIVE'] }
            },
            select: { id: true }
        });

        return NextResponse.json({ activeSessionId: activeSession?.id || null });
    } catch (error) {
        console.error('Error fetching active session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
