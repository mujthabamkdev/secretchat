import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || user.password !== password) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        (await cookies()).set('userId', user.id, { path: '/' });
        return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
