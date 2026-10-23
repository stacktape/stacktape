import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  describeNextPackagingError,
  getWindowsNextBuildCommand,
  hasDefaultPrismaSchema,
  warnIfNextVersionUnsupported
} from './nextjs-web';

describe('Windows Next.js build command', () => {
  test('selects the compatible build command for installed Next versions', () => {
    for (const [version, prefix] of [
      ['14.2.35', 'npx next build &&'],
      ['15.5.0', 'npx next build &&'],
      ['16.1.0', 'npx next build --webpack &&'],
      [undefined, 'npx next build &&']
    ] as const) {
      expect(getWindowsNextBuildCommand(version)).toStartWith(prefix);
    }
  });
});

describe('Next.js packaging diagnostics', () => {
  test('keeps the actionable child-process failure in the user-visible error', () => {
    expect(describeNextPackagingError('website', new Error('Next.js build exited with code 1.'))).toBe(
      'Error when packaging nextjs-web "website".\nNext.js build exited with code 1.'
    );
  });
});

describe('Next.js Prisma prerequisite', () => {
  test('detects only the conventional application-local Prisma schema', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-next-prisma-'));
    try {
      expect(hasDefaultPrismaSchema(directory)).toBeFalse();
      await mkdir(join(directory, 'prisma'));
      await writeFile(join(directory, 'prisma', 'schema.prisma'), 'generator client { provider = "prisma-client-js" }');
      expect(hasDefaultPrismaSchema(directory)).toBeTrue();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

const warningsFor = async ({ installedVersion, now }: { installedVersion: string; now: Date }) => {
  // The version is resolved like OpenNext does: from the application directory up, so a hoisted install counts.
  const workspace = await mkdtemp(join(tmpdir(), 'stacktape-next-support-'));
  try {
    await mkdir(join(workspace, 'node_modules', 'next'), { recursive: true });
    await writeFile(
      join(workspace, 'node_modules', 'next', 'package.json'),
      JSON.stringify({ version: installedVersion })
    );
    await mkdir(join(workspace, 'apps', 'web'), { recursive: true });
    const warnings: string[] = [];
    await warnIfNextVersionUnsupported({
      resourceName: 'web',
      absoluteAppDirectory: join(workspace, 'apps', 'web'),
      warn: (message) => warnings.push(message),
      now
    });
    return warnings;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
};

describe('Next.js support policy warning', () => {
  test('stays quiet for a major the Next.js team still supports', async () => {
    expect(await warningsFor({ installedVersion: '16.0.1', now: new Date('2026-10-23T12:00:00Z') })).toEqual([]);
    // A major newer than the release-date table is newer than every supported major.
    expect(await warningsFor({ installedVersion: '17.0.0', now: new Date('2026-10-23T12:00:00Z') })).toEqual([]);
  });

  test('warns once for a major past its two years of support', async () => {
    expect(await warningsFor({ installedVersion: '15.5.6', now: new Date('2026-10-23T12:00:00Z') })).toEqual([
      '`web` uses Next.js 15, which is no longer supported by the Next.js team and gets no security fixes. ' +
        'Upgrade to Next.js 16. See https://nextjs.org/support-policy.'
    ]);
    // A major older than the release-date table is long past its support.
    expect(await warningsFor({ installedVersion: '11.1.4', now: new Date('2026-10-23T12:00:00Z') })).toHaveLength(1);
  });

  test('ends support two years after the release date', async () => {
    // Next.js 15 was released on 2024-10-21.
    expect(await warningsFor({ installedVersion: '15.0.0-canary.3', now: new Date('2026-10-21T00:00:00Z') })).toEqual(
      []
    );
    expect(await warningsFor({ installedVersion: '15.0.0', now: new Date('2026-10-21T00:00:01Z') })).toHaveLength(1);
  });
});
