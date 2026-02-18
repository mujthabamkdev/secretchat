import prisma from '@/lib/prisma';
import ImageGallery from '@/components/ImageGallery';
import styles from '@/app/dashboard/profile/[id]/page.module.css';

export default async function AdminFramesPage() {
    const frames = await prisma.callFrame.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100, // Limit to 100 recent for now
        include: {
            user: { select: { username: true } },
            session: {
                select: {
                    participant1: { select: { username: true } },
                    participant2: { select: { username: true } }
                }
            }
        }
    });

    // Format for gallery
    const formattedFrames = frames.map(f => ({
        id: f.id,
        imageUrl: f.imageUrl,
        timestamp: f.timestamp.toISOString(),
        // Add metadata if needed for display? ImageGallery currently only shows image/time.
        // Maybe update ImageGallery to show username?
        username: f.user?.username ||
            (f.session ? `${f.session.participant1.username} & ${f.session.participant2.username}` : 'Unknown Log')
    }));

    return (
        <div className="container" style={{ padding: '20px' }}>
            <h1 className="heading">Global Frame Monitor</h1>
            <p className="subheading">Manage all captured frames system-wide.</p>

            <ImageGallery frames={formattedFrames} />
        </div>
    );
}
