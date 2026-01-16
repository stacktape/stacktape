import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.STP_POSTGRES_DB_CONNECTION_STRING });
const prisma = new PrismaClient({ adapter });

const seed = async () => {
  console.info('Seeding database...');

  // Check if data already exists
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.info(`Database already has ${existingUsers} users, skipping seed`);
    return;
  }

  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      posts: {
        create: [
          { title: 'Hello World', content: 'This is my first post!', published: true },
          { title: 'Draft Post', content: 'Work in progress...', published: false }
        ]
      }
    }
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      posts: {
        create: [{ title: 'Introduction to Prisma', content: 'Prisma is a great ORM for Node.js', published: true }]
      }
    }
  });

  console.info(`Created users: ${alice.name}, ${bob.name}`);
  console.info('Seeding completed');
};

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
