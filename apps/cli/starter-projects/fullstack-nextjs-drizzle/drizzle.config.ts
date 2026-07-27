import { defineConfig } from 'drizzle-kit';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connString = process.env.STP_DATABASE_CONNECTION_STRING!;
const url = connString.includes('sslmode=') ? connString : `${connString}${connString.includes('?') ? '&' : '?'}sslmode=require`;

export default defineConfig({
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url }
});
