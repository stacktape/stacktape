import { describe, expect, test } from 'bun:test';
import { getDockerfileBaseImages } from '../artifact/generated-image-build';
import { buildDotnetArtifactDockerfile, buildEsDevDockerfile, buildEsDockerfile } from './dockerfiles';

const withDependencies = (requiresGlibcBinaries: boolean) =>
  buildEsDockerfile({
    dependencies: [{ name: 'pdfkit', version: '0.16.0' }],
    packageManager: 'npm',
    requiresGlibcBinaries,
    nodeVersion: 24
  });

describe('Stacktape Dockerfile contracts', () => {
  test('names the public images a generated Dockerfile starts from, not its own stages', () => {
    expect(getDockerfileBaseImages(withDependencies(true))).toEqual([
      'public.ecr.aws/docker/library/node:24-bookworm',
      'public.ecr.aws/docker/library/node:24-bookworm-slim'
    ]);
    expect(getDockerfileBaseImages(withDependencies(false))).toEqual(['public.ecr.aws/docker/library/node:24-alpine']);
    expect(
      getDockerfileBaseImages('FROM --platform=linux/arm64 golang:1.23 AS build\nFROM build AS test\nFROM scratch\n')
    ).toEqual(['golang:1.23']);
  });

  test('builds glibc dependencies with full tooling but ships them in the slim runtime image', () => {
    const dockerfile = buildEsDockerfile({
      dependencies: [{ name: 'bcrypt', version: '6.0.0' }],
      packageManager: 'npm',
      requiresGlibcBinaries: true,
      nodeVersion: 24
    });

    expect(dockerfile).toStartWith('FROM public.ecr.aws/docker/library/node:24-bookworm AS deps\n');
    expect(dockerfile).toContain('FROM public.ecr.aws/docker/library/node:24-bookworm-slim');
    expect(dockerfile).toContain('COPY --from=deps /install-dir/ /app');
    expect(dockerfile).toContain('tini curl openssl');
    expect(dockerfile).toContain('ENV NODE_ENV production');
  });

  test('builds .NET Lambda artifacts in runtime-compatible SAM images', () => {
    const dotnet = buildDotnetArtifactDockerfile({
      dotnetVersion: 8,
      projectFilePath: 'Smoke.csproj',
      target: 'lambda'
    });

    expect(dotnet).toStartWith('FROM public.ecr.aws/sam/build-dotnet8:latest AS build');
    expect(dotnet).toContain('CustomAfterMicrosoftCommonTargets');
    expect(dotnet).toContain('/dist/.stacktape-assembly-name');
  });

  test('runs bundles on the official Bun and Deno images with their own package managers', () => {
    const bun = buildEsDockerfile({
      dependencies: [{ name: 'sharp', version: '0.34.0' }],
      packageManager: 'npm',
      requiresGlibcBinaries: false,
      nodeVersion: 24,
      runtime: 'bun'
    });
    const deno = buildEsDockerfile({
      dependencies: [],
      packageManager: 'npm',
      requiresGlibcBinaries: false,
      nodeVersion: 24,
      runtime: 'deno'
    });
    const bunDev = buildEsDevDockerfile({
      dependencies: [],
      packageManager: 'npm',
      requiresGlibcBinaries: false,
      nodeVersion: 24,
      runtime: 'bun'
    });

    expect(bun).toStartWith('FROM docker.io/oven/bun:1 AS deps');
    expect(bun).toContain('RUN bun add sharp@0.34.0');
    expect(bun).toContain('FROM docker.io/oven/bun:1-slim');
    expect(bun).toContain('CMD ["bun", "index.js"]');
    expect(bun).not.toContain('node:24');
    expect(deno).toStartWith('FROM docker.io/denoland/deno:debian-2.9.7');
    expect(deno).toContain('CMD ["deno", "run", "--allow-all", "index.js"]');
    expect(bunDev).toContain('CMD ["bun", "dist/index.js"]');
  });
});
