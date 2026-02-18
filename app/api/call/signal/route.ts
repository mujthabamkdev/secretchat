import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// POST: Send a WebRTC signal (OFFER, ANSWER, ICE)
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { sessionId, type, payload } = body;

        if (!sessionId || !type || !payload) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Verify the user is part of the session
        const session = await prisma.callSession.findUnique({
            where: { id: sessionId },
            select: { participant1Id: true, participant2Id: true, status: true }
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.participant1Id !== currentUserId && session.participant2Id !== currentUserId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Create the signal
        await prisma.callSignal.create({
            data: {
                sessionId,
                senderId: currentUserId,
                type,
                payload,
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Signal POST] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET: Poll for new signals
export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        const lastSignalId = searchParams.get('lastSignalId'); // Pagination cursor

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        // Fetch signals from the OTHER user that are newer than lastSignalId
        const signals = await prisma.callSignal.findMany({
            where: {
                sessionId,
                senderId: { not: currentUserId }, // Only get signals from the other peer
                ...(lastSignalId ? { id: { gt: lastSignalId } } : {})
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ signals });
    } catch (error) {
        console.error('[Signal GET] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
