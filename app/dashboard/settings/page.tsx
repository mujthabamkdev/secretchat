import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SettingsForm from './SettingsForm';

export default async function SettingsPage() {
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('userId')?.value;
    if (!currentUserId) redirect('/auth/login');

    const user = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!user) redirect('/auth/login');

    return (
        <div className="container">
            <SettingsForm
                initialUsername={user.username}
                initialName={user.name}
                initialBio={user.bio || ''}
                initialAvatarUrl={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            />
        </div>
    );
}
