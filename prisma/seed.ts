import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1k realistic usernames — first name + optional suffix
const firstNames = [
    'emma', 'liam', 'olivia', 'noah', 'ava', 'ethan', 'sophia', 'mason', 'isabella', 'logan',
    'mia', 'lucas', 'amelia', 'jackson', 'harper', 'aiden', 'evelyn', 'caden', 'abigail', 'grayson',
    'ella', 'mateo', 'scarlett', 'henry', 'aria', 'owen', 'luna', 'sebastian', 'chloe', 'caleb',
    'penelope', 'elijah', 'layla', 'jack', 'riley', 'wyatt', 'zoey', 'luke', 'nora', 'jayden',
    'lily', 'leo', 'eleanor', 'isaac', 'hannah', 'gabriel', 'lillian', 'julian', 'addison', 'levi',
    'aubrey', 'daniel', 'stella', 'anthony', 'natalie', 'samuel', 'aurora', 'david', 'savannah', 'john',
    'audrey', 'carter', 'brooklyn', 'dylan', 'bella', 'ryan', 'claire', 'nathan', 'skylar', 'hunter',
    'lucy', 'christian', 'paisley', 'andrew', 'anna', 'thomas', 'caroline', 'josiah', 'genesis', 'connor',
    'sadie', 'eli', 'aaliyah', 'ezra', 'kennedy', 'aaron', 'kinsley', 'landon', 'allison', 'adrian',
    'maya', 'miles', 'sarah', 'robert', 'madelyn', 'asher', 'alexa', 'nolan', 'ariana', 'jaxon',
    'elena', 'lincoln', 'gabriella', 'jordan', 'naomi', 'christopher', 'alice', 'cameron', 'hailey',
    'ivan', 'eva', 'alex', 'emilia', 'kai', 'autumn', 'zach', 'jade', 'max', 'violet',
    'felix', 'hazel', 'oscar', 'ruby', 'theo', 'iris', 'finn', 'willow', 'hugo', 'ivy',
    'cole', 'grace', 'adam', 'elise', 'jake', 'daisy', 'charlie', 'freya', 'marcus', 'piper',
    'dean', 'quinn', 'blake', 'nova', 'troy', 'eden', 'remy', 'vera', 'jude', 'sage',
    'cruz', 'wren', 'knox', 'reese', 'axel', 'june', 'rio', 'faye', 'cash', 'hope',
    'rhys', 'pearl', 'nico', 'maeve', 'kyle', 'lena', 'sean', 'nina', 'tate', 'rosa',
    'beau', 'kira', 'reed', 'demi', 'wade', 'lexi', 'zane', 'tessa', 'seth', 'mila',
    'jorge', 'bianca', 'diego', 'selena', 'rafael', 'priya', 'amit', 'yara', 'omar', 'zara',
    'tariq', 'laila', 'hassan', 'fatima', 'ravi', 'ananya', 'vikram', 'meera', 'arjun', 'sana',
];

const suffixes = [
    '', '_x', '_dev', '_real', '_hq', '.io', '_', '99', '07', '23',
    '_official', '_xo', '2k', '_v', '_prime', '_ace', '_pro', '_one', '_go', '_fx',
    '.', '_z', '_wave', '_byte', '_hub', '_lab', '_core', '_sky', '_arc', '_jet',
];

const displayNameParts = [
    'The', 'Cool', 'Dark', 'Silent', 'Swift', 'Cosmic', 'Neon', 'Pixel', 'Shadow', 'Storm',
    'Night', 'Star', 'Frost', 'Echo', 'Blaze', 'Ghost', 'Zen', 'Drift', 'Pulse', 'Flux',
];

function generateUsers(count: number) {
    const users = new Set<string>();
    const emails = new Set<string>();
    const result: { username: string; email: string; name: string; password: string; avatarUrl: string }[] = [];

    while (result.length < count) {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const num = Math.random() > 0.5 ? Math.floor(Math.random() * 999).toString() : '';
        const username = `${first}${suffix}${num}`;
        const email = `${username.replace(/\./g, '_')}@gmail.com`;

        if (users.has(username) || emails.has(email) || username.length > 25) continue;
        users.add(username);
        emails.add(email);

        const displayAdj = displayNameParts[Math.floor(Math.random() * displayNameParts.length)];
        const displayName = `${displayAdj} ${first.charAt(0).toUpperCase() + first.slice(1)}`;

        result.push({
            username,
            email,
            name: displayName,
            password: 'demo1234',
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        });
    }

    return result;
}

async function main() {
    console.log('🌱 Ensuring Admin account...');
    await prisma.user.upsert({
        where: { email: 'secretchatreal@gmail.com' },
        update: { role: 'ADMIN', username: 'admin', password: 'AdmiN_@777', name: 'SecretChat Admin' },
        create: {
            username: 'admin',
            email: 'secretchatreal@gmail.com',
            name: 'SecretChat Admin',
            password: 'AdmiN_@777',
            role: 'ADMIN',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        },
    });

    console.log('🌱 Seeding 1,000 dummy users...');
    const users = generateUsers(1000);

    // Batch insert in chunks of 50
    for (let i = 0; i < users.length; i += 50) {
        const chunk = users.slice(i, i + 50);
        await Promise.all(
            chunk.map((u) =>
                prisma.user.upsert({
                    where: { email: u.email },
                    update: {},
                    create: u,
                })
            )
        );
        console.log(`  ✓ ${Math.min(i + 50, users.length)} / ${users.length}`);
    }

    const total = await prisma.user.count();
    console.log(`\n✅ Done! Total users in database: ${total}`);
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
