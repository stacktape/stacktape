import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const GENERATED_SCOPES = [
  'apps/cli/starter-projects-metadata.json',
  'apps/cli/@generated/schemas/validate-config-zod.ts',
  'apps/cli/@generated/schemas/enhanced-config-schema.json',
  'apps/cli/@generated/llm-docs',
  'packages/config/generated/config-schema.json',
  'packages/design-tokens/generated/tokens.css'
];

const gitLines = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
    throw new Error(`git ${args[0]} failed: ${detail}`);
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
};

export const findGeneratedChanges = (cwd = process.cwd()) => {
  const tracked = gitLines(cwd, ['diff', '--name-only', 'HEAD', '--', ...GENERATED_SCOPES]);
  const untracked = gitLines(cwd, ['ls-files', '--others', '--exclude-standard', '--', ...GENERATED_SCOPES]);
  return { tracked, untracked };
};

export const checkGeneratedDiff = (cwd = process.cwd()) => {
  const changes = findGeneratedChanges(cwd);
  if (changes.tracked.length === 0 && changes.untracked.length === 0) return true;

  console.error('Generated outputs are not committed and up to date.');
  if (changes.tracked.length > 0) console.error(`Tracked changes:\n${changes.tracked.join('\n')}`);
  if (changes.untracked.length > 0) console.error(`Untracked outputs:\n${changes.untracked.join('\n')}`);
  return false;
};

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectInvocation) {
  try {
    if (!checkGeneratedDiff(process.argv[2] ?? process.cwd())) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
