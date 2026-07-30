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

// POST batch action on multiple selected users
export async function POST(req: Request) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { userIds, action } = await req.json();

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });
        }

        // Super Admin Protection Filter
        const superAdminFilter = { email: { not: 'secretchatreal@gmail.com' } };

        if (action === 'revoke') {
            const superAdmin = await prisma.user.findFirst({ where: { email: 'secretchatreal@gmail.com' }, select: { id: true } });
            const filteredUserIds = superAdmin ? userIds.filter(id => id !== superAdmin.id) : userIds;

            await prisma.message.deleteMany({ where: { senderId: { in: filteredUserIds } } });
            await prisma.callSignal.deleteMany({ where: { senderId: { in: filteredUserIds } } });
            await prisma.callSession.deleteMany({
                where: { OR: [{ participant1Id: { in: filteredUserIds } }, { participant2Id: { in: filteredUserIds } }] }
            });
            await prisma.report.deleteMany({
                where: { OR: [{ reporterId: { in: filteredUserIds } }, { reportedId: { in: filteredUserIds } }] }
            });
            await prisma.friendRequest.deleteMany({
                where: { OR: [{ senderId: { in: filteredUserIds } }, { receiverId: { in: filteredUserIds } }] }
            });
            const result = await prisma.user.deleteMany({ where: { id: { in: filteredUserIds }, ...superAdminFilter } });
            return NextResponse.json({ success: true, count: result.count, message: `Revoked ${result.count} users` });
        }

        if (action === 'suspend') {
            const result = await prisma.user.updateMany({
                where: { id: { in: userIds }, ...superAdminFilter },
                data: { suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) }
            });
            return NextResponse.json({ success: true, count: result.count, message: `Suspended ${result.count} users` });
        }

        if (action === 'block') {
            const result = await prisma.user.updateMany({
                where: { id: { in: userIds }, ...superAdminFilter },
                data: { blocked: true }
            });
            return NextResponse.json({ success: true, count: result.count, message: `Blocked ${result.count} users` });
        }

        if (action === 'unblock') {
            const result = await prisma.user.updateMany({
                where: { id: { in: userIds }, ...superAdminFilter },
                data: { blocked: false, suspendedUntil: null }
            });
            return NextResponse.json({ success: true, count: result.count, message: `Unblocked ${result.count} users` });
        }

        if (action === 'makeAdmin') {
            const result = await prisma.user.updateMany({
                where: { id: { in: userIds }, ...superAdminFilter },
                data: { role: 'ADMIN' }
            });
            return NextResponse.json({ success: true, count: result.count, message: `Promoted ${result.count} users to admin` });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Batch user action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
