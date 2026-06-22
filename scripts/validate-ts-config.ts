/**
 * Standalone TS-config gate: typechecks raw .ts Stacktape config files against the local npm export
 * (__release-npm) by rewriting `from 'stacktape'` to the local path and running `tsc --noEmit`.
 * Used by the docs-example creator/verifier to self-check raw .ts examples before they are embedded.
 *
 * Prerequisite: `bun build:npm:main`.
 *
 * Usage: bun scripts/validate-ts-config.ts <file.ts> [...]
 * Exit code 0 if all typecheck, 1 otherwise.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { emptyDir, readFile, remove, writeFile } from 'fs-extra';

const execFileAsync = promisify(execFile);
// Unique per process so concurrent invocations across a fan-out don't clobber each other.
const TMP_DIR = resolve(`node_modules/.cache/stp-ts-config-${process.pid}-${Date.now()}`);
const RELEASE_NPM = resolve('__release-npm').replaceAll('\\', '/');

const main = async () => {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: bun scripts/validate-ts-config.ts <file.ts> [...]');
    process.exit(2);
  }

  await emptyDir(TMP_DIR);
  const nameMap = new Map<string, string>();
  await Promise.all(
    files.map(async (f, i) => {
      const code = (await readFile(f, 'utf-8'))
        .replaceAll("from 'stacktape'", `from '${RELEASE_NPM}'`)
        .replaceAll('from "stacktape"', `from "${RELEASE_NPM}"`);
      const name = `cfg_${i}.ts`;
      await writeFile(join(TMP_DIR, name), code, 'utf-8');
      nameMap.set(name, f);
    })
  );

  // tsconfig `files` list rather than CLI args (avoids OS command-line length limit for many files).
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
      files: [...nameMap.keys()]
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

  if (ok) {
    for (const f of files) console.info(`OK   ${f}`);
  } else {
    const errsByFile = new Map<string, string[]>();
    for (const m of stdout.matchAll(/^(cfg_\d+\.ts)\((\d+),(\d+)\):\s*(error.*)$/gm)) {
      const src = nameMap.get(m[1]) ?? m[1];
      if (!errsByFile.has(src)) errsByFile.set(src, []);
      errsByFile.get(src)!.push(`line ${m[2]}: ${m[4]}`);
    }
    for (const f of files) {
      if (errsByFile.has(f)) {
        console.info(`FAIL ${f}`);
        for (const e of errsByFile.get(f)!) console.info(`       ${e}`);
      } else console.info(`OK   ${f}`);
    }
    if (errsByFile.size === 0) console.info(`tsc failed:\n${stdout.slice(0, 2000)}`);
  }
  process.exit(ok ? 0 : 1);
};

main();
