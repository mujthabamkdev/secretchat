const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const session = await prisma.callSession.findUnique({
        where: { id: 'cmlp8l1du000113rp9v5e493x' },
        include: { frames: true, participant1: { select: { username: true } }, participant2: { select: { username: true } } }
    });

    if (!session) { console.log('Session not found!'); return; }

    console.log('Session ID:', session.id);
    console.log('Participants:', session.participant1.username, '<->', session.participant2.username);
    console.log('Started:', session.startedAt);
    console.log('Ended:', session.endedAt);
    console.log('Frame count:', session.frames.length);

    session.frames.forEach(function (f, i) {
        console.log('  Frame', i + 1, ':', f.imageUrl.substring(0, 60), '| Timestamp:', f.timestamp);
    });
}

main().then(function () { return prisma.$disconnect(); });
