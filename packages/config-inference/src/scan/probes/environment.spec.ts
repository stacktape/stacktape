/**
 * The environment probe's hosting claim: which file speaks for where the data lives.
 *
 * The property under protection is the "never replace a live external database" guarantee. It
 * triggers off `currentlyHostedOn`, and `currentlyHostedOn` comes from environment files that can
 * disagree: the laptop's `.env` says localhost while `.env.production` says Supabase. Whichever
 * claim wins decides whether composition provisions a brand-new database next to a live one.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
import { environmentProbe } from './environment';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-env-probe-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('the environment probe hosting claim', () => {
  it('lets a managed provider beat the laptop, whichever file is read first', async () => {
    root = await makeRepo({
      // `.env` sorts (and is usually listed) before `.env.production`. First-wins here would
      // record `local` and quietly bypass the live-database protection.
      '.env': 'DATABASE_URL=postgres://localhost:5432/dev\n',
      '.env.production': 'DATABASE_URL=postgres://db.abcdefgh.supabase.co:5432/postgres\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [environmentProbe] });
    const database = facts.dependencies.find((entry) => entry.kind === 'postgres');

    expect(database?.currentlyHostedOn).toBe('supabase');
  });

  it('keeps the managed provider when a later file names localhost', async () => {
    root = await makeRepo({
      '.env': 'DATABASE_URL=postgres://db.abcdefgh.supabase.co:5432/postgres\n',
      '.env.development': 'DATABASE_URL=postgres://localhost:5432/dev\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [environmentProbe] });
    const database = facts.dependencies.find((entry) => entry.kind === 'postgres');

    expect(database?.currentlyHostedOn).toBe('supabase');
  });
});
