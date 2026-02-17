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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { action } = await req.json();

    try {
        if (action === 'revoke') {
            // Delete user and all related data
            await prisma.report.deleteMany({ where: { OR: [{ reporterId: id }, { reportedId: id }] } });
            await prisma.friendRequest.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
            await prisma.deviceInfo.deleteMany({ where: { userId: id } });
            await prisma.user.delete({ where: { id } });
            return NextResponse.json({ success: true, message: 'User revoked' });
        }

        if (action === 'suspend') {
            await prisma.user.update({
                where: { id },
                data: { suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) },
            });
            return NextResponse.json({ success: true, message: 'User suspended for 24 hours' });
        }

        if (action === 'block') {
            await prisma.user.update({
                where: { id },
                data: { blocked: true },
            });
            return NextResponse.json({ success: true, message: 'User blocked' });
        }

        if (action === 'unblock') {
            await prisma.user.update({
                where: { id },
                data: { blocked: false, suspendedUntil: null },
            });
            return NextResponse.json({ success: true, message: 'User unblocked' });
        }

        if (action === 'makeAdmin') {
            await prisma.user.update({
                where: { id },
                data: { role: 'ADMIN' },
            });
            return NextResponse.json({ success: true, message: 'User promoted to admin' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Admin action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
