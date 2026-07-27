/**
 * TS gate: extracts every ```ts example embedded in the given Stacktape type files and typechecks each
 * against the freshly-built local npm export (__release-npm), by rewriting `from 'stacktape'` to the
 * local path and running `tsc --noEmit`. Proves the TS examples compile against the latest types.
 *
 * Prerequisite: `bun build:npm:main` (so __release-npm/index.d.ts reflects the current types).
 *
 * Usage:
 *   bun scripts/validate-ts-examples.ts <file.d.ts> [...]      # specific files
 *   bun scripts/validate-ts-examples.ts                        # all types/stacktape-config/*.d.ts
 *   bun scripts/validate-ts-examples.ts --json ...
 *
 * Exit code 0 if every example typechecks, 1 otherwise.
 */
import { extractFencedExamples } from './code-generation/extract-examples';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import fastGlob from 'fast-glob';
import { emptyDir, readFile, remove, writeFile } from 'fs-extra';

const execFileAsync = promisify(execFile);
// Unique per process so concurrent invocations (e.g. one per file across a fan-out) don't clobber each other.
const TMP_DIR = resolve(`node_modules/.cache/stp-ts-examples-${process.pid}-${Date.now()}`);
const RELEASE_NPM = resolve('__release-npm').replaceAll('\\', '/');

const main = async () => {
  const argv = process.argv.slice(2);
  const jsonMode = argv.includes('--json');
  let files = argv.filter((a) => a !== '--json');
  if (files.length === 0) files = await fastGlob('types/stacktape-config/*.d.ts');

  const examples = [];
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    examples.push(...extractFencedExamples(file, content).filter((e) => e.lang === 'ts'));
  }

  if (examples.length === 0) {
    console.info('No ts examples found.');
    process.exit(0);
  }

  await emptyDir(TMP_DIR);
  // Map temp filename -> example, so tsc errors map back to the source property.
  const fileMap = new Map<string, (typeof examples)[number]>();
  await Promise.all(
    examples.map(async (ex, i) => {
      const name = `ex_${i}.ts`;
      const rewritten = ex.code
        .replaceAll("from 'stacktape'", `from '${RELEASE_NPM}'`)
        .replaceAll('from "stacktape"', `from "${RELEASE_NPM}"`);
      await writeFile(join(TMP_DIR, name), rewritten, 'utf-8');
      fileMap.set(name, ex);
    })
  );

  // Use a tsconfig `files` list rather than CLI args — hundreds of filenames blow past the OS
  // command-line length limit (Windows: "The command line is too long").
  await writeFile(
    join(TMP_DIR, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        moduleResolution: 'bundler',
        module: 'esnext',
        target: 'es2022'
      },
      files: [...fileMap.keys()]
    }),
    'utf-8'
  );

  let stdout = '';
  let ok = true;
  try {
    await execFileAsync('bunx', ['tsc', '-p', 'tsconfig.json'], { cwd: TMP_DIR, shell: true });
  } catch (err: any) {
    ok = false;
    stdout = `${err.stdout ?? ''}${err.stderr ?? ''}`;
  } finally {
    await remove(TMP_DIR).catch(() => {});
  }

  // Parse tsc errors: "ex_3.ts(6,43): error TS2322: ..."
  const failures = new Map<string, { property: string; file: string; line: number; messages: string[] }>();
  for (const m of stdout.matchAll(/^(ex_\d+\.ts)\((\d+),(\d+)\):\s*(error.*)$/gm)) {
    const ex = fileMap.get(m[1]);
    if (!ex) continue;
    const key = m[1];
    if (!failures.has(key)) failures.set(key, { property: ex.property, file: ex.file, line: ex.line, messages: [] });
    failures.get(key)!.messages.push(`${m[4]} (example line ${m[2]})`);
  }

  if (jsonMode) {
    console.info(
      JSON.stringify({ total: examples.length, failed: failures.size, failures: [...failures.values()] }, null, 2)
    );
  } else {
    console.info(
      `Total: ${examples.length} ts examples, ${examples.length - failures.size} valid, ${failures.size} invalid.`
    );
    for (const f of failures.values()) {
      console.info(`\nFAIL ${f.file}:${f.line}  (property: ${f.property})`);
      for (const msg of f.messages) console.info(`     ${msg}`);
    }
    if (!ok && failures.size === 0)
      console.info(`\ntsc failed but no per-example errors parsed:\n${stdout.slice(0, 2000)}`);
  }
  process.exit(failures.size === 0 && ok ? 0 : 1);
};

main();
