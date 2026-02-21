import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// Update read receipts (delivered or read) or burn ephemeral messages
export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { messageIds, status, burn } = await req.json();

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return NextResponse.json({ error: 'Missing messageIds array' }, { status: 400 });
        }

        if (burn) {
            // Handle Snapchat style ephemeral message burning
            await prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    type: { in: ['EPHEMERAL_IMAGE', 'EPHEMERAL_TEXT'] },
                    isBurned: false
                },
                data: {
                    isBurned: true,
                    content: null, // Clear the content payload
                    expiresAt: new Date()
                }
            });
            return NextResponse.json({ success: true, burned: true });
        }

        if (status === 'DELIVERED') {
            await prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    senderId: { not: currentUserId }, // cannot mark own messages delivered this way
                    deliveredAt: null
                },
                data: { deliveredAt: new Date() }
            });
        } else if (status === 'READ') {
            await prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    senderId: { not: currentUserId },
                    readAt: null
                },
                data: {
                    readAt: new Date(),
                    deliveredAt: new Date() // implicitly delivered if read
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update message error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
