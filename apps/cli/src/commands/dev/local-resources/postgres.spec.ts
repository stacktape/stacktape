import { describe, expect, it } from 'bun:test';
import { postgresDataPath } from './postgres';

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
