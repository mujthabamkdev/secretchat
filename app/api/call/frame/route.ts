import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob;
        const sessionId = formData.get('sessionId') as string;

        if (!file || !sessionId) return NextResponse.json({ error: 'Missing file or sessionId' }, { status: 400 });

        // In local development, we'll just mock vercel blob if token is missing
        let imageUrl = "https://placehold.co/600x400?text=Snapshot";

        if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== 'mock_token') {
            const blob = await put(`calls/${sessionId}/${Date.now()}.jpg`, file, {
                access: 'public',
            });
            imageUrl = blob.url;
        }

        await prisma.callFrame.create({
            data: {
                sessionId,
                imageUrl,
            }
        });

        return NextResponse.json({ success: true, url: imageUrl });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
