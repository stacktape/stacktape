/**
 * The Dockerfile ownership decision: templates yield to the tuned packaging, real work stays.
 *
 * Properties under protection: classification errs toward `custom` (a wrong "custom" costs
 * nothing; a wrong "boilerplate" swaps packaging); the decision is raised only when another proven
 * way to run exists; and accepting the recommendation strips the Dockerfile *fact* while the file
 * itself stays untouched in the repository.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../compose/compose';
import { assembleCandidateFacts } from './assemble';
import { classifyDockerfile } from './dockerfile-ownership';
import { dockerfileProbe } from './probes/dockerfile';
import { manifestProbe } from './probes/manifest';

const BOILERPLATE_DOCKERFILE = [
  'FROM node:20-alpine',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci',
  'COPY . .',
  'EXPOSE 3000',
  'CMD ["npm", "start"]',
  ''
].join('\n');

const CUSTOM_DOCKERFILE = [
  'FROM node:20-alpine',
  'RUN apk add --no-cache imagemagick ffmpeg',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci',
  'COPY . .',
  'ENTRYPOINT ["./docker-entrypoint.sh"]',
  ''
].join('\n');

describe('classifyDockerfile', () => {
  it('recognizes the standard template shape', () => {
    expect(classifyDockerfile(BOILERPLATE_DOCKERFILE)).toBe('boilerplate');
  });

  it('treats real work as custom: system packages, entrypoint scripts, healthchecks, odd bases', () => {
    expect(classifyDockerfile(CUSTOM_DOCKERFILE)).toBe('custom');
    expect(
      classifyDockerfile('FROM node:20\nHEALTHCHECK CMD curl -f http://localhost:3000/\nCMD ["npm","start"]')
    ).toBe('custom');
    expect(classifyDockerfile('FROM my-registry.internal/base:1\nCMD ["npm","start"]')).toBe('custom');
    expect(classifyDockerfile('FROM node:20\nVOLUME /data\nCMD ["npm","start"]')).toBe('custom');
  });

  it('accepts the standard two-stage builder pattern as boilerplate', () => {
    const twoStage = [
      'FROM node:20-alpine AS builder',
      'WORKDIR /app',
      'COPY package*.json ./',
      'RUN npm ci',
      'COPY . .',
      'RUN npm run build',
      'FROM node:20-alpine',
      'WORKDIR /app',
      'COPY --from=builder /app/dist ./dist',
      'COPY package*.json ./',
      'RUN npm ci --omit=dev',
      'CMD ["node", "dist/index.js"]',
      ''
    ].join('\n');
    expect(classifyDockerfile(twoStage)).toBe('boilerplate');
  });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-dockerfile-own-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('the ownership decision, end to end', () => {
  let root: string;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  const APP_MANIFEST = JSON.stringify({
    name: 'orders',
    scripts: { start: 'node index.js' },
    dependencies: { express: '^4.19.0' }
  });

  it('recommends Stacktape packaging for a template, and the composition follows', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      Dockerfile: BOILERPLATE_DOCKERFILE
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [manifestProbe, dockerfileProbe] });
    const decision = facts.uncertainties.find((entry) => entry.kind === 'dockerfile-ownership');
    expect(decision?.kind === 'dockerfile-ownership' ? decision.recommended : undefined).toBe('stacktape-packaging');

    // The recommendation is applied by the assumption machinery: the composed packaging is ours,
    // and only the *fact* was removed — the file is still in the repository.
    const { config, assumptions } = composeConfig({ facts });
    expect(assumptions.some((entry) => entry.kind === 'dockerfile-ownership')).toBe(true);
    expect((config.resources.orders!.properties.packaging as { type: string }).type).not.toBe('custom-dockerfile');
  });

  it('keeps a custom Dockerfile authoritative without asking anything', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      Dockerfile: CUSTOM_DOCKERFILE
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [manifestProbe, dockerfileProbe] });
    expect(facts.uncertainties.some((entry) => entry.kind === 'dockerfile-ownership')).toBe(false);

    const { config } = composeConfig({ facts });
    expect((config.resources.orders!.properties.packaging as { type: string }).type).toBe('custom-dockerfile');
  });

  it('never asks when the Dockerfile is the only way to run the service', async () => {
    root = await makeRepo({
      // No package.json: nothing else proves how this starts.
      Dockerfile: BOILERPLATE_DOCKERFILE
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [manifestProbe, dockerfileProbe] });
    expect(facts.uncertainties.some((entry) => entry.kind === 'dockerfile-ownership')).toBe(false);
  });

  it('honours the user flipping the decision back', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      Dockerfile: BOILERPLATE_DOCKERFILE
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [manifestProbe, dockerfileProbe] });
    const { config } = composeConfig({
      facts,
      decisions: { 'dockerfile-ownership:orders': 'keep-dockerfile' }
    });
    expect((config.resources.orders!.properties.packaging as { type: string }).type).toBe('custom-dockerfile');
  });
});
