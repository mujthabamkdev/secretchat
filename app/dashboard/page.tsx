import prisma from '@/lib/prisma';
import styles from './page.module.css';
import Link from 'next/link';
import { cookies } from 'next/headers';
import DashboardTabsClient from './DashboardTabsClient';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const query = (await searchParams).q || '';
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('userId')?.value;

    const currentUser = currentUserId
        ? await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true, avatarUrl: true, username: true } })
        : null;
    const isAdmin = currentUser?.role === 'ADMIN';

    const users = await prisma.user.findMany({
        where: {
            AND: [
                currentUserId ? { id: { not: currentUserId } } : {},
                {
                    OR: [
                        { username: { contains: query, mode: 'insensitive' } },
                        { name: { contains: query, mode: 'insensitive' } },
                    ],
                },
            ],
        },
        take: 50,
    });

    // Fetch friends (connections)
    const connections = currentUserId ? await prisma.friendRequest.findMany({
        where: {
            OR: [
                { senderId: currentUserId, status: 'APPROVED' },
                { receiverId: currentUserId, status: 'APPROVED' }
            ]
        },
        include: {
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
            receiver: { select: { id: true, name: true, username: true, avatarUrl: true } }
        }
    }) : [];

    const friends = await Promise.all(connections.map(async conn => {
        const friend = conn.senderId === currentUserId ? conn.receiver : conn.sender;

        // Find latest message between currentUserId and friend.id
        const latestMessage = await prisma.message.findFirst({
            where: {
                conversation: {
                    AND: [
                        { participants: { some: { id: currentUserId } } },
                        { participants: { some: { id: friend.id } } }
                    ]
                }
            },
            orderBy: { sentAt: 'desc' }
        });

        return { ...friend, latestMessage };
    }));

    const profileAvatar = currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'default'}`;
    const communityUsers = users.filter((u: any) => !friends.find(f => f.id === u.id));

    return (
        <DashboardTabsClient
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            profileAvatar={profileAvatar}
            friends={friends}
            communityUsers={communityUsers}
        />
    );
}
