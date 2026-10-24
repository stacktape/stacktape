import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveLocalDatabasePassword } from './container-helpers';

// The password of a local database without a configured one. A data directory keeps the password it was initialized
// with, so the rule must never hand an existing directory a different password than the one it holds.
test('a local database gets a stored random password, and data created before keeps the old fixed one', () => {
  const root = mkdtempSync(join(tmpdir(), 'stacktape-local-password-'));
  try {
    const resolve = (name: string, { legacy = true } = {}) =>
      resolveLocalDatabasePassword({
        passwordFile: join(root, name, 'password'),
        dataDir: join(root, name, 'data'),
        legacyPassword: legacy ? 'localdevpassword' : undefined
      });

    // A fresh database: random, private to the user, and the same on every later start.
    mkdirSync(join(root, 'fresh', 'data'), { recursive: true });
    const fresh = resolve('fresh');
    expect(fresh.legacy).toBeFalse();
    expect(fresh.password).toMatch(/^[0-9a-f]{36}$/);
    if (process.platform !== 'win32') expect(statSync(join(root, 'fresh', 'password')).mode & 0o777).toBe(0o600);
    writeFileSync(join(root, 'fresh', 'data', 'PG_VERSION'), '16');
    expect(resolve('fresh')).toEqual(fresh);
    mkdirSync(join(root, 'other', 'data'), { recursive: true });
    expect(resolve('other').password).not.toBe(fresh.password);

    // Data initialized by an older CLI holds the fixed password; the database keeps working with it.
    mkdirSync(join(root, 'existing', 'data'), { recursive: true });
    writeFileSync(join(root, 'existing', 'data', 'PG_VERSION'), '16');
    expect(resolve('existing')).toEqual({ password: 'localdevpassword', legacy: true });
    expect(readFileSync(join(root, 'existing', 'password'), 'utf8')).toBe('localdevpassword');
    expect(resolve('existing')).toEqual({ password: 'localdevpassword', legacy: false });

    // `--freshDb` deletes the data with its password file, which also moves a legacy database to a generated password.
    rmSync(join(root, 'existing'), { recursive: true });
    mkdirSync(join(root, 'existing', 'data'), { recursive: true });
    expect(resolve('existing')).toMatchObject({ legacy: false, password: expect.stringMatching(/^[0-9a-f]{36}$/) });

    // Redis reads its password at every start, so existing data never pins an old one.
    mkdirSync(join(root, 'cache', 'data'), { recursive: true });
    writeFileSync(join(root, 'cache', 'data', 'dump.rdb'), '');
    expect(resolve('cache', { legacy: false })).toMatchObject({
      legacy: false,
      password: expect.stringMatching(/^[0-9a-f]{36}$/)
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
