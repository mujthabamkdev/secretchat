import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// Fetch messages between current user and a friend
export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const friendId = searchParams.get('friendId');

        if (!friendId) {
            return NextResponse.json({ error: 'Missing friendId' }, { status: 400 });
        }

        // Find conversation where both users are participants
        const conversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: currentUserId } } },
                    { participants: { some: { id: friendId } } },
                ]
            },
            include: {
                messages: {
                    orderBy: { sentAt: 'asc' },
                    take: 100 // Load last 100 messages for simplicity
                }
            }
        });

        if (!conversation) {
            return NextResponse.json({ messages: [], conversationId: null });
        }

        return NextResponse.json({
            messages: conversation.messages,
            conversationId: conversation.id
        });
    } catch (error) {
        console.error('Fetch messages error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Send a new message
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentUserId = cookieStore.get('userId')?.value;
        if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { friendId, content, type = 'TEXT' } = await req.json();

        if (!friendId) {
            return NextResponse.json({ error: 'Missing friendId' }, { status: 400 });
        }
        if (!content && !['IMAGE', 'EPHEMERAL_IMAGE'].includes(type) && !['EPHEMERAL_TEXT', 'TEXT'].includes(type)) {
            // we should have at least content for TEXT
            return NextResponse.json({ error: 'Message content is empty' }, { status: 400 });
        }

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: currentUserId } } },
                    { participants: { some: { id: friendId } } },
                ]
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    participants: {
                        connect: [{ id: currentUserId }, { id: friendId }]
                    }
                }
            });
        }

        // Create the message
        const message = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: currentUserId,
                type,
                content,
                sentAt: new Date(),
                // Delivered / Read tracking won't be set until the other user receives it
            }
        });

        return NextResponse.json({ success: true, message });
    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
