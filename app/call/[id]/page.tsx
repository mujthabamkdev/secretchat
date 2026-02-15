import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import styles from './page.module.css';
import ClientCallInterface from './ClientCallInterface';
import { notFound, redirect } from 'next/navigation';

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('userId')?.value;
    if (!currentUserId) redirect('/auth/login');

    const session = await prisma.callSession.findUnique({
        where: { id },
        include: { participant1: true, participant2: true },
    });

    if (!session) notFound();

    // Verify user is part of this session
    if (session.participant1Id !== currentUserId && session.participant2Id !== currentUserId) {
        redirect('/dashboard');
    }

    const otherUser = session.participant1Id === currentUserId ? session.participant2 : session.participant1;

    return (
        <div className={styles.callWrapper}>
            <ClientCallInterface sessionId={id} otherUser={otherUser} />
        </div>
    );
}
