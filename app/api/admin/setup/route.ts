import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// POST /api/admin/setup — Makes the current logged-in user an admin
// Only works if there are no admins yet (first-time setup)
export async function POST() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Check if any admin already exists
        const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (existingAdmin) {
            return NextResponse.json({ error: 'An admin already exists. Contact them for access.' }, { status: 403 });
        }

        // Promote current user to admin
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'ADMIN' },
        });

        return NextResponse.json({ success: true, message: 'You are now an admin!' });
    } catch (error) {
        console.error('Admin setup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
