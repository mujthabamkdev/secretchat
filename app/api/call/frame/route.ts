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
                console.error('[Frame] Vercel Blob upload failed, falling back to Base64:', blobError);
                // Convert to Base64
                const buffer = Buffer.from(await file.arrayBuffer());
                imageUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            }
        } else {
            console.warn('[Frame] No valid BLOB_READ_WRITE_TOKEN found. Using Base64 storage fallback.');
            // Convert to Base64
            const buffer = Buffer.from(await file.arrayBuffer());
            imageUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        }

        // Verify session exists
        const sessionExists = await prisma.callSession.findUnique({
            where: { id: sessionId },
            select: { id: true }
        });

        if (!sessionExists) {
            console.error(`[Frame] Session not found: ${sessionId}`);
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
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
