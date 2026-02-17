import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import styles from './page.module.css';
import ProfileActions from '@/components/ProfileActions';
import { notFound } from 'next/navigation';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('userId')?.value;

    const user = await prisma.user.findUnique({
        where: { id },
    });

    if (!user) notFound();

    let relationshipStatus = 'NONE'; // NONE, SENT, RECEIVED, APPROVED
    if (currentUserId && currentUserId !== id) {
        const request = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId: currentUserId, receiverId: id },
                    { senderId: id, receiverId: currentUserId },
                ],
            },
        });

        if (request) {
            if (request.status === 'APPROVED') relationshipStatus = 'APPROVED';
            else if (request.senderId === currentUserId) relationshipStatus = 'SENT';
            else relationshipStatus = 'RECEIVED';
        }
    }

    return (
        <div className="container">
            <div className={styles.profileHeader}>
                <div className={styles.avatarLarge}>
                    <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.name} />
                </div>
                <h1 className="heading" style={{ marginTop: '16px' }}>{user.name}</h1>
                <p className="subheading">@{user.username}</p>
            </div>

            <div className={styles.actionsContainer}>
                <ProfileActions
                    targetUserId={id}
                    targetUserName={user.name}
                    currentUserId={currentUserId!}
                    initialStatus={relationshipStatus}
                />
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3 className="heading" style={{ fontSize: '1rem' }}>About</h3>
                <p className="subheading" style={{ marginBottom: 0 }}>{user.bio || 'This is a private profile. Start a session to connect securely.'}</p>
            </div>
        </div>
    );
}
