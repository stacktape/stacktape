/**
 * The compose file is the dependency list somebody already wrote down.
 *
 * These tests exist mostly to protect two properties that are easy to lose: that a stated engine
 * version reaches the composed database, and that reading a compose file never lets a laptop's
 * container speak for where production data lives.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
import { dockerComposeProbe } from './docker-compose';
import { environmentProbe } from './environment';
import { manifestProbe } from './manifest';

const PROBES = [manifestProbe, dockerComposeProbe, environmentProbe];

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-compose-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

const APP_MANIFEST = JSON.stringify({ name: 'api', scripts: { start: 'node index.js' } });

describe('the compose probe', () => {
  it('reads the dependency list, with the version the file states', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'docker-compose.yml': [
        'services:',
        '  app:',
        '    build: .',
        '    ports: ["3000:3000"]',
        '  db:',
        '    image: postgres:15.4-alpine',
        '  cache:',
        '    image: redis:7',
        '  search:',
        '    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const byKind = Object.fromEntries(facts.dependencies.map((entry) => [entry.kind, entry]));

    expect(Object.keys(byKind).toSorted()).toEqual(['postgres', 'redis', 'search']);
    // The whole point of reading the file: 15 rather than whatever our default happens to be.
    expect(byKind.postgres?.engineVersion).toBe('15.4');
    expect(byKind.postgres?.evidence[0]?.quote).toContain('postgres:15.4-alpine');
    // `build: .` is the user's own application, not a backing service.
    expect(facts.dependencies.some((entry) => entry.name === 'app')).toBe(false);
  });

  it('settles Postgres-or-MySQL, so nothing has to ask', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      // `DATABASE_URL` with no scheme is the case that otherwise becomes the pipeline's one
      // genuinely unanswerable question.
      '.env': 'DATABASE_URL=\n',
      'docker-compose.yml': 'services:\n  db:\n    image: mysql:8\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.dependencies.map((entry) => entry.kind)).toEqual(['mysql']);
    expect(facts.uncertainties.filter((entry) => entry.kind === 'database-engine-ambiguous')).toHaveLength(0);
  });

  it('never lets a local container claim to be the live database', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      '.env': 'DATABASE_URL=postgres://<DATABASE_USER>:<DATABASE_PASSWORD>@db.abcdefg.supabase.co:5432/postgres\n',
      'docker-compose.yml': 'services:\n  db:\n    image: postgres:16\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    // The compose file describes a laptop. The `.env` file describes production, and only it may
    // decide that there is a live database we must not replace.
    expect(facts.dependencies[0]?.currentlyHostedOn).toBe('supabase');
    expect(facts.dependencies[0]?.engineVersion).toBe('16');
  });

  it('does not invent a dependency from somebody else’s fork of an image', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'docker-compose.yml': 'services:\n  thing:\n    image: ghcr.io/acme/redis:7\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.dependencies).toHaveLength(0);
  });

  it('says nothing at all about a compose file it cannot parse', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'docker-compose.yml': 'services:\n  db:\n  image: [unbalanced\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.dependencies).toHaveLength(0);
  });
});
