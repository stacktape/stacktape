import { describe, expect, it } from 'bun:test';
import { hasPreVersion18Data, postgresDataPath, preVersion18DataError } from './postgres';

describe('local Postgres data volume', () => {
  it.each([
    ['16.9', '/var/lib/postgresql/data'],
    ['17', '/var/lib/postgresql/data'],
    ['18.1', '/var/lib/postgresql'],
    ['latest', '/var/lib/postgresql']
  ])('version %s mounts at %s', (version, path) => {
    expect(postgresDataPath(version)).toBe(path);
  });
});

describe('data written under the pre-18 path', () => {
  const denied = Object.assign(new Error('denied'), { code: 'EACCES' });
  const missing = Object.assign(new Error('missing'), { code: 'ENOENT' });

  it.each([
    ['PG_VERSION at the old root', async () => ['PG_VERSION', 'base', 'global'], false, true],
    ['the Postgres 18 layout', async () => ['18'], false, false],
    ['no data yet', async () => Promise.reject(missing), true, false],
    ['an unreadable directory with old data', async () => Promise.reject(denied), true, true],
    ['an unreadable directory without old data', async () => Promise.reject(denied), false, false]
  ] as const)('%s', async (_case, readDirectory, foundInContainer, expected) => {
    const found = await hasPreVersion18Data({
      dataDir: '/data/db',
      imageTag: 'postgres:18.1',
      readDirectory: readDirectory as () => Promise<string[]>,
      runCheck: async () => foundInContainer
    });
    expect(found).toBe(expected);
  });

  it('tells the developer how to keep or replace the data', () => {
    expect(preVersion18DataError('db', '18.1').message).toContain('--fresh-db');
  });
});
