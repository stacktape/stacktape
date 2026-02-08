import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.STP_DATABASE_CONNECTION_STRING!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
