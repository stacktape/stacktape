import { resolve } from 'path';
import { commandSync } from 'execa';

commandSync('npx prisma db push --skip-generate', {
  env: { DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING },
  stdio: 'inherit',
  cwd: resolve(__dirname, '..'),
});
