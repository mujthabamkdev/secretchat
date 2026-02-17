import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

async function isAdmin() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) return false;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role === 'ADMIN';
}

// GET all users with report counts
export async function GET(req: Request) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const users = await prisma.user.findMany({
        where: search ? {
            OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
            ],
        } : {},
        select: {
            id: true,
            username: true,
            email: true,
            name: true,
            avatarUrl: true,
            role: true,
            blocked: true,
            suspendedUntil: true,
            createdAt: true,
            _count: { select: { reportsReceived: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
}
