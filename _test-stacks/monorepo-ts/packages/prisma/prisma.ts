import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

const adapter = new PrismaPg({
  ssl: { rejectUnauthorized: false },
  connectionString: process.env.STP_MAIN_DATABASE_CONNECTION_STRING,
});

export const prisma = new PrismaClient({ adapter });
