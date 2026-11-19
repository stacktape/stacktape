import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnvironmentText, readEnvironmentValues } from './environment-values';

describe('parseEnvironmentText', () => {
  it.each([
    ['DOMAIN=localhost', 'DOMAIN', 'localhost'],
    ['export DOMAIN=example.org', 'DOMAIN', 'example.org'],
    ['PROJECT_NAME="Full Stack FastAPI Project"', 'PROJECT_NAME', 'Full Stack FastAPI Project'],
    ["NAME='single # not a comment'", 'NAME', 'single # not a comment'],
    ['SMTP_PORT=587 # the default', 'SMTP_PORT', '587'],
    ['HASH=abc#def', 'HASH', 'abc#def'],
    ['SMTP_HOST=', 'SMTP_HOST', ''],
    ['  SPACED = value  ', 'SPACED', 'value'],
    ['KEY="line one\\nline two"', 'KEY', 'line one\nline two']
  ])('%s', (text, name, value) => {
    expect(parseEnvironmentText(text).get(name)).toBe(value);
  });

  it('skips comments and other lines, reads a quoted value over several lines, and lets a later line win', () => {
    const parsed = parseEnvironmentText(
      '# DOMAIN=commented\nnot an assignment\nCERT="-----\nabc\n-----"\nDOMAIN=first\r\nDOMAIN=second\n'
    );
    expect([...parsed.keys()]).toEqual(['CERT', 'DOMAIN']);
    expect(parsed.get('CERT')).toBe('-----\nabc\n-----');
    expect(parsed.get('DOMAIN')).toBe('second');
  });
});

describe('readEnvironmentValues', () => {
  const made: string[] = [];
  const repository = async (files: Record<string, string>) => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-env-values-'));
    made.push(root);
    for (const [path, text] of Object.entries(files)) await writeFile(join(root, path), text);
    return root;
  };
  afterEach(async () => {
    for (const root of made.splice(0)) await rm(root, { recursive: true, force: true });
  });

  it('returns only the asked variables, empty ones included, and nothing else in the file', async () => {
    const root = await repository({ '.env': 'DOMAIN=localhost\nSMTP_HOST=\nAWS_SECRET_ACCESS_KEY=never-returned\n' });
    expect(
      await readEnvironmentValues({ repositoryRoot: root, names: new Set(['DOMAIN', 'SMTP_HOST', 'MISSING']) })
    ).toEqual({
      file: '.env',
      values: [
        { name: 'DOMAIN', value: 'localhost' },
        { name: 'SMTP_HOST', value: '' }
      ]
    });
  });

  it('has no file when the repository has no .env', async () => {
    const root = await repository({ '.env.example': 'DOMAIN=example.org\n' });
    expect(await readEnvironmentValues({ repositoryRoot: root, names: new Set(['DOMAIN']) })).toEqual({
      file: undefined
    });
  });

  it('does not follow a .env that links outside the repository', async () => {
    const outside = await repository({ secrets: 'DOMAIN=outside\n' });
    const root = await repository({});
    await symlink(join(outside, 'secrets'), join(root, '.env'));
    expect(await readEnvironmentValues({ repositoryRoot: root, names: new Set(['DOMAIN']) })).toEqual({
      file: undefined
    });
  });
});
