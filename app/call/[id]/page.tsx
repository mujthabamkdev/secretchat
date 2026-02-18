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

    // If session is already ended, go back
    if (session.status === 'ENDED') redirect('/dashboard');

    // Verify user is part of this session
    if (session.participant1Id !== currentUserId && session.participant2Id !== currentUserId) {
        redirect('/dashboard');
    }

    const isCaller = session.participant1Id === currentUserId;
    const otherUser = isCaller ? session.participant2 : session.participant1;

    const currentUser = isCaller ? session.participant1 : session.participant2;
    const isAdmin = currentUser.role === 'ADMIN';

    return (
        <div className={styles.callWrapper}>
            <ClientCallInterface
                sessionId={id}
                otherUser={otherUser}
                isCaller={isCaller}
                initialStatus={session.status}
                isAdmin={isAdmin}
            />
        </div>
    );
}
