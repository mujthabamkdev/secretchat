import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { reportedId, reason, severity } = await req.json();

        if (!reportedId || !reason || !severity) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
            return NextResponse.json({ error: 'Invalid severity' }, { status: 400 });
        }

        if (currentUserId === reportedId) {
            return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
        }

        // Create the report
        await prisma.report.create({
            data: {
                reporterId: currentUserId,
                reportedId,
                reason,
                severity,
            },
        });

        // Count total reports for the reported user
        const totalReports = await prisma.report.count({
            where: { reportedId },
        });

        // Auto-suspension thresholds
        if (totalReports >= 500) {
            await prisma.user.update({
                where: { id: reportedId },
                data: { blocked: true },
            });
        } else if (totalReports >= 100) {
            await prisma.user.update({
                where: { id: reportedId },
                data: { suspendedUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }, // 2 days
            });
        } else if (totalReports >= 40) {
            await prisma.user.update({
                where: { id: reportedId },
                data: { suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 24 hours
            });
        } else if (totalReports >= 20) {
            await prisma.user.update({
                where: { id: reportedId },
                data: { suspendedUntil: new Date(Date.now() + 6 * 60 * 60 * 1000) }, // 6 hours
            });
        }

        return NextResponse.json({ success: true, totalReports });
    } catch (error) {
        console.error('Report error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
