import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeNextPackagingError, getWindowsNextBuildCommand, hasDefaultPrismaSchema } from './nextjs-web';

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
