import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// Check username availability
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');
        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;

        const existing = await prisma.user.findUnique({ where: { username } });
        const available = !existing || existing.id === currentUserId;

        return NextResponse.json({ available });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Update profile
export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { username, name, bio, avatarUrl } = await req.json();

        // If username is changing, check availability
        if (username) {
            const existing = await prisma.user.findUnique({ where: { username } });
            if (existing && existing.id !== currentUserId) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
            }
        }

        const updateData: any = {};
        if (username !== undefined) updateData.username = username;
        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

        const user = await prisma.user.update({
            where: { id: currentUserId },
            data: updateData,
        });

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
