import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob;
        const sessionId = formData.get('sessionId') as string;

        if (!file || !sessionId) return NextResponse.json({ error: 'Missing file or sessionId' }, { status: 400 });

        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
        const hasBlobToken = !!blobToken && blobToken !== 'mock_token' && blobToken.length > 20;

        let imageUrl: string;

        if (hasBlobToken) {
            try {
                const blob = await put(`calls/${sessionId}/${Date.now()}.jpg`, file, {
                    access: 'public',
                    token: blobToken,
                });
                imageUrl = blob.url;
            } catch (blobError) {
                console.error('[Frame] Vercel Blob upload failed:', blobError);
                imageUrl = "https://placehold.co/600x400?text=Upload+Failed";
            }
        } else {
            console.warn('[Frame] No valid BLOB_READ_WRITE_TOKEN found. Using placeholder. Token present:', !!blobToken, 'Token length:', blobToken?.length ?? 0);
            imageUrl = "https://placehold.co/600x400?text=Snapshot";
        }

        await prisma.callFrame.create({
            data: {
                sessionId,
                imageUrl,
            }
        });

        return NextResponse.json({ success: true, url: imageUrl });
    } catch (error) {
        console.error('[Frame] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
