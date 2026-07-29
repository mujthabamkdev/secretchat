import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET /api/user/key?userId=xxx  -> Returns user's E2EE public key
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, publicKey: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ publicKey: user.publicKey });
    } catch (error) {
        console.error('Fetch public key error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/user/key -> Sets current user's E2EE public key
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { publicKey } = await req.json();

        if (!publicKey) {
            return NextResponse.json({ error: 'Missing publicKey' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: currentUserId },
            data: { publicKey },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Store public key error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
