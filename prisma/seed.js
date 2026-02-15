const { PrismaClient } = require('./client/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    const users = [];
    for (let i = 1; i <= 1000; i++) {
        const username = `user${i}`;
        users.push({
            username,
            name: `User ${i}`,
            password: 'password123',
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        });
    }

    // createMany is not supported on SQLite by default in all versions, 
    // but Prisma supports it in recent versions for SQLite.
    // Actually, createMany IS supported in SQLite.
    try {
        await prisma.user.createMany({
            data: users,
            skipDuplicates: true,
        });
        console.log('Seeding finished.');
    } catch (e) {
        console.error('Batch insert failed, trying individual inserts...', e.message);
        // Fallback if needed
        for (const user of users) {
            await prisma.user.upsert({
                where: { username: user.username },
                update: {},
                create: user,
            });
        }
        console.log('Seeding finished via fallback.');
    }

}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
