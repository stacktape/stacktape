import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateTypeDeclarations, NPM_DECLARATION_FILE_NAMES } from './build-npm-main-export';

export const MONACO_DECLARATIONS_OUTPUT_DIRECTORY = join(process.cwd(), '.generated', 'monaco-declarations');

export async function generateMonacoDeclarations({
  outputDirectory = MONACO_DECLARATIONS_OUTPUT_DIRECTORY
}: {
  outputDirectory?: string;
} = {}) {
  await rm(outputDirectory, { recursive: true, force: true });
  await generateTypeDeclarations({ outputDirectory });
}

export async function checkMonacoDeclarations() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'stacktape-monaco-declarations-'));

  try {
    await generateMonacoDeclarations({ outputDirectory: temporaryDirectory });
    const actualFileNames = (await readdir(MONACO_DECLARATIONS_OUTPUT_DIRECTORY)).sort();
    const expectedFileNames = [...NPM_DECLARATION_FILE_NAMES].sort();

    if (actualFileNames.join('\n') !== expectedFileNames.join('\n')) {
      throw new Error(
        `Monaco declarations contain unexpected files. Expected ${expectedFileNames.join(', ')}, got ${actualFileNames.join(', ')}.`
      );
    }

    for (const fileName of expectedFileNames) {
      const [generated, current] = await Promise.all([
        readFile(join(temporaryDirectory, fileName)),
        readFile(join(MONACO_DECLARATIONS_OUTPUT_DIRECTORY, fileName))
      ]);
      if (!generated.equals(current)) {
        throw new Error(`Monaco declaration ${fileName} is stale. Run pnpm run generate:monaco.`);
      }
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const operation = process.argv.includes('--check') ? checkMonacoDeclarations() : generateMonacoDeclarations();
  operation.catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
