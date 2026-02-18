import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob;
        const sessionId = formData.get('sessionId') as string | null;

        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;

        if (!file || (!sessionId && !userId)) {
            return NextResponse.json({ error: 'Missing file or user/session context' }, { status: 400 });
        }

        const uploadPath = sessionId ? `calls/${sessionId}/${Date.now()}.jpg` : `users/${userId}/${Date.now()}.jpg`;

        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
        const hasBlobToken = !!blobToken && blobToken !== 'mock_token' && blobToken.length > 20;

        let imageUrl: string;

        if (hasBlobToken) {
            try {
                const blob = await put(uploadPath, file, {
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

        // Verify session if provided
        if (sessionId) {
            const sessionExists = await prisma.callSession.findUnique({
                where: { id: sessionId },
                select: { id: true }
            });

            if (!sessionExists) {
                // If session is deleted or invalid, don't crash, just log and skip session link
                console.warn(`[Frame] Session not found: ${sessionId}, saving as user frame`);
                await prisma.callFrame.create({
                    data: {
                        userId: userId || undefined,
                        imageUrl,
                    }
                });
                return NextResponse.json({ success: true, url: imageUrl, warning: 'Session not found' });
            }
        }

        await prisma.callFrame.create({
            data: {
                sessionId: sessionId || undefined,
                userId: userId || undefined,
                imageUrl,
            }
        });

        return NextResponse.json({ success: true, url: imageUrl });
    } catch (error) {
        console.error('[Frame] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
