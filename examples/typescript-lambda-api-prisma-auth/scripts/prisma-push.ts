import { readFileSync } from 'fs';
import { resolve } from 'path';
import { commandSync } from 'execa';

export const prismaPush = () => {
  const stage = process.argv[process.argv.indexOf('--stage') + 1];
  const outputsPath = resolve(__dirname, '..', '.outputs', `${stage}.json`);
  const outputs = JSON.parse(readFileSync(outputsPath, 'utf8'));

  commandSync('npx prisma db push --skip-generate', {
    env: { DB_CONNECTION_STRING: outputs.dbConnectionString },
    stdio: 'inherit',
    cwd: resolve(__dirname, '..')
  });
};
