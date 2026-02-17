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

// GET aggregated reports grouped by reported user
export async function GET() {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Get all reported users with their report details
    const reportedUsers = await prisma.user.findMany({
        where: {
            reportsReceived: { some: {} },
        },
        select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
            blocked: true,
            suspendedUntil: true,
            reportsReceived: {
                select: {
                    id: true,
                    reason: true,
                    severity: true,
                    createdAt: true,
                    reporter: { select: { username: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Aggregate the data
    const reports = reportedUsers.map(user => {
        const severityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
        user.reportsReceived.forEach(r => {
            severityCounts[r.severity as keyof typeof severityCounts]++;
        });

        const maxSeverity = severityCounts.CRITICAL > 0 ? 'CRITICAL'
            : severityCounts.HIGH > 0 ? 'HIGH'
                : severityCounts.MEDIUM > 0 ? 'MEDIUM' : 'LOW';

        return {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
                blocked: user.blocked,
                suspendedUntil: user.suspendedUntil,
            },
            totalReports: user.reportsReceived.length,
            maxSeverity,
            severityCounts,
            latestReason: user.reportsReceived[0]?.reason || '',
            latestReport: user.reportsReceived[0]?.createdAt,
            reports: user.reportsReceived.slice(0, 10), // last 10 reports
        };
    });

    // Sort by total reports descending
    reports.sort((a, b) => b.totalReports - a.totalReports);

    return NextResponse.json({ reports });
}
