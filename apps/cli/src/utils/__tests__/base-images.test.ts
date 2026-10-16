import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { keepBaseImagePulled } from '../base-images';

const previousHome = process.env.HOME;
let home: string;

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), 'stp-base-images-'));
  process.env.HOME = home;
});

afterAll(async () => {
  process.env.HOME = previousHome;
  await rm(home, { recursive: true, force: true });
});

const HOUR = 60 * 60 * 1000;
const START = Date.parse('2026-10-16T08:00:00Z');

describe('base images of generated Dockerfiles', () => {
  test('are pulled once a day per platform, and a failed pull is tried again', async () => {
    const pulls: string[] = [];
    let failPulls = false;
    const pull = async ({ reference, platform }: { reference: string; platform: string | undefined }) => {
      if (failPulls) throw new Error('registry unreachable');
      pulls.push(`${platform} ${reference}`);
    };
    const keep = (reference: string, platform: string | undefined, hoursLater: number) =>
      keepBaseImagePulled({ reference, platform, pull, isPresent: async () => true, now: START + hoursLater * HOUR });

    expect(await keep('node:24-alpine', 'linux/amd64', 0)).toBe('pulled');
    expect(await keep('node:24-alpine', 'linux/amd64', 23)).toBe('recent');
    expect(await keep('node:24-alpine', 'linux/arm64', 23)).toBe('pulled');
    expect(await keep('node:24-alpine', 'linux/amd64', 25)).toBe('pulled');

    failPulls = true;
    expect(await keep('node:24-bookworm', 'linux/amd64', 25)).toBe('failed');
    failPulls = false;
    expect(await keep('node:24-bookworm', 'linux/amd64', 25)).toBe('pulled');

    expect(pulls).toEqual([
      'linux/amd64 node:24-alpine',
      'linux/arm64 node:24-alpine',
      'linux/amd64 node:24-alpine',
      'linux/amd64 node:24-bookworm'
    ]);
  });
});

test('an image the record calls recent is pulled again when the local store no longer holds it for the platform', async () => {
  const local = new Set<string>();
  const pulls: string[] = [];
  const pull = async ({ reference, platform }: { reference: string; platform: string | undefined }) => {
    pulls.push(`${platform} ${reference}`);
    // The classic image store keeps one platform per tag: a pull for another architecture replaces it.
    for (const entry of local) if (entry.endsWith(` ${reference}`)) local.delete(entry);
    local.add(`${platform} ${reference}`);
  };
  const isPresent = async ({ reference, platform }: { reference: string; platform: string | undefined }) =>
    local.has(`${platform} ${reference}`);
  const keep = (platform: string) =>
    keepBaseImagePulled({ reference: 'node:22-alpine', platform, pull, isPresent, now: START + HOUR });

  expect(await keep('linux/amd64')).toBe('pulled');
  expect(await keep('linux/amd64')).toBe('recent');
  expect(await keep('linux/arm64')).toBe('pulled');
  expect(await keep('linux/amd64')).toBe('pulled');
  expect(pulls).toEqual(['linux/amd64 node:22-alpine', 'linux/arm64 node:22-alpine', 'linux/amd64 node:22-alpine']);
});
