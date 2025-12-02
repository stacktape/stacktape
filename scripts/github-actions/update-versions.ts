import { join } from 'node:path';
import yargsParser from 'yargs-parser';
import { adjustPackageJsonVersion } from '../release/args';

const main = async () => {
  const argv = yargsParser(process.argv.slice(2));
  const version = argv.version as string;

  if (!version) {
    throw new Error('Version is required. Usage: --version <version>');
  }

  await Promise.all([
    adjustPackageJsonVersion({
      path: join(process.cwd(), 'package.json'),
      newVersion: version
    }),
    adjustPackageJsonVersion({
      path: join(process.cwd(), 'src', 'api', 'npm', 'package.json'),
      newVersion: version
    })
  ]);
};

if (import.meta.main) {
  main().catch((error) => {
    console.error('Error updating versions:', error);
    process.exit(1);
  });
}
