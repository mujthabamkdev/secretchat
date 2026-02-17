import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// Create a new call session (caller initiates)
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();

        // Handle sendBeacon end-call (comes as POST with sessionId + action)
        if (body.sessionId && body.action === 'end') {
            await prisma.callSession.update({
                where: { id: body.sessionId },
                data: { endedAt: new Date(), status: 'ENDED' },
            });
            return NextResponse.json({ success: true });
        }

        const { targetUserId } = body;

        // End any stale RINGING sessions from this caller first
        await prisma.callSession.updateMany({
            where: {
                participant1Id: currentUserId,
                status: 'RINGING',
            },
            data: { status: 'ENDED', endedAt: new Date() },
        });

        const session = await prisma.callSession.create({
            data: {
                participant1Id: currentUserId,
                participant2Id: targetUserId,
                status: 'RINGING',
            }
        });

        return NextResponse.json({ sessionId: session.id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Update a call session (end call, accept call)
export async function PATCH(req: Request) {
    try {
        const { sessionId, action } = await req.json();

        if (action === 'end') {
            await prisma.callSession.update({
                where: { id: sessionId },
                data: { endedAt: new Date(), status: 'ENDED' }
            });
        } else if (action === 'accept') {
            await prisma.callSession.update({
                where: { id: sessionId },
                data: { status: 'ACTIVE' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Check call status / incoming calls
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            const cookieStore = await cookies();
            const currentUserId = cookieStore.get('userId')?.value;
            if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

            // Auto-expire calls ringing for more than 60 seconds
            await prisma.callSession.updateMany({
                where: {
                    status: 'RINGING',
                    startedAt: { lt: new Date(Date.now() - 60000) },
                },
                data: { status: 'ENDED', endedAt: new Date() },
            });

            const incomingCall = await prisma.callSession.findFirst({
                where: {
                    participant2Id: currentUserId,
                    status: 'RINGING',
                },
                include: {
                    participant1: { select: { name: true, username: true, avatarUrl: true } },
                },
                orderBy: { startedAt: 'desc' },
            });

            return NextResponse.json({ incomingCall });
        }

        const session = await prisma.callSession.findUnique({
            where: { id: sessionId },
            select: { status: true },
        });

        if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        return NextResponse.json({ status: session.status });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
