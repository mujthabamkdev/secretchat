import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { del } from '@vercel/blob';

export async function DELETE(req: Request) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { ids } = await req.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        // Fetch frames to get blob URLs if needed (for cleanup)
        // Note: If using Base64, no external cleanup is needed.
        // If using Blob, we should delete from Blob storage too.

        const frames = await prisma.callFrame.findMany({
            where: { id: { in: ids } },
            select: { imageUrl: true }
        });

        // Delete from Blob storage (optimistic, don't fail if partial error)
        const blobUrls = frames
            .map(f => f.imageUrl)
            .filter(url => url.startsWith('http') && !url.includes('placehold')); // primitive check for blob

        if (blobUrls.length > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                await del(blobUrls);
            } catch (e) {
                console.error('Failed to delete blobs', e);
            }
        }

        // Delete from DB
        await prisma.callFrame.deleteMany({
            where: { id: { in: ids } }
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error('Error deleting frames:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
