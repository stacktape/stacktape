import { describe, expect, test } from 'bun:test';
import {
  buildDotnetArtifactDockerfile,
  buildEsDevDockerfile,
  buildEsDockerfile,
  buildGoArtifactDockerfile,
  buildJavaArtifactDockerfile,
  buildPythonArtifactDockerfile,
  buildRubyArtifactDockerfile,
  buildRustArtifactDockerfile,
  CARGO_LAMBDA_IMAGE
} from './dockerfiles';

describe('Stacktape Dockerfile contracts', () => {
  test('builds a nested Go package and exports a stripped bootstrap without compile-only Go sources', () => {
    const dockerfile = buildGoArtifactDockerfile({
      alpine: true,
      entryfilePath: 'cmd/api/main.go'
    });

    expect(dockerfile).toContain('go build -buildvcs=false -trimpath -ldflags="-s -w" -o /bootstrap -- \'./cmd/api\'');
    expect(dockerfile).toContain('cp /bootstrap /artifact/bootstrap');
    expect(dockerfile).not.toContain('go mod tidy');
    expect(dockerfile).toContain("find /artifact -type f \\( -name '*.go'");
    expect(dockerfile).toContain('COPY --from=build /artifact .');
  });

  test('honours glibc requirements even when an ES image has no external dependencies', () => {
    const dockerfile = buildEsDockerfile({
      dependencies: [],
      packageManager: 'npm',
      requiresGlibcBinaries: true,
      nodeVersion: 24
    });

    expect(dockerfile).toStartWith('FROM public.ecr.aws/docker/library/node:24-bookworm-slim\n');
    expect(dockerfile).not.toContain('node:24-alpine');
    expect(dockerfile).toContain('tini curl openssl');
    expect(dockerfile).toContain('ENV NODE_ENV production');
    expect(dockerfile).toContain('rm -rf /var/lib/apt/lists/*');
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

  test('exports locked uv dependencies before installing them', () => {
    const dockerfile = buildPythonArtifactDockerfile({
      pythonVersion: 3.12,
      alpine: true
    });

    expect(dockerfile).toMatch(/uv-lock" \]; then\s+uv export --locked --no-dev --no-emit-project/);
  });

  test('builds native Python and Ruby Lambda dependencies in runtime-compatible SAM images', () => {
    const python = buildPythonArtifactDockerfile({
      pythonVersion: 3.14,
      alpine: true,
      target: 'lambda'
    });
    const ruby = buildRubyArtifactDockerfile({
      rubyVersion: 4,
      alpine: true,
      target: 'lambda'
    });

    expect(python).toStartWith('FROM public.ecr.aws/sam/build-python3.14:latest AS build');
    expect(ruby).toStartWith('FROM public.ecr.aws/sam/build-ruby4.0:latest AS build');
    expect(python).not.toContain('-alpine');
    expect(ruby).not.toContain('-alpine');
  });

  test('builds Java and .NET Lambda artifacts in runtime-compatible SAM images', () => {
    const java = buildJavaArtifactDockerfile({
      javaVersion: 21,
      useMaven: true,
      target: 'lambda'
    });
    const dotnet = buildDotnetArtifactDockerfile({
      dotnetVersion: 8,
      projectFilePath: 'Smoke.csproj',
      target: 'lambda'
    });

    expect(java).toStartWith('FROM public.ecr.aws/sam/build-java21:latest AS build');
    expect(dotnet).toStartWith('FROM public.ecr.aws/sam/build-dotnet8:latest AS build');
    expect(dotnet).toContain('CustomAfterMicrosoftCommonTargets');
    expect(dotnet).toContain('/dist/.stacktape-assembly-name');
  });

  test('supports the Bundler gems.rb manifest', () => {
    const artifact = buildRubyArtifactDockerfile({
      rubyVersion: 4,
      target: 'lambda'
    });

    expect(artifact).toContain('[ -f Gemfile ] || [ -f gems.rb ]');
    expect(artifact).toContain("bundle config set --local without 'development test'");
    expect(artifact).toContain('BUNDLE_GEMFILE="$gemfile" bundle install');
    expect(artifact).not.toContain('bundle install --without');
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

  test('cross-compiles Rust Lambda bootstraps with cargo-lambda and quotes the binary name', () => {
    const arm = buildRustArtifactDockerfile({ binaryName: "my app's api", architecture: 'arm64' });
    const x86 = buildRustArtifactDockerfile({ binaryName: 'api', architecture: 'x86_64' });

    expect(arm).toStartWith(`FROM ${CARGO_LAMBDA_IMAGE} AS build`);
    expect(arm).toContain(`cargo lambda build --release --arm64 --bin 'my app'"'"'s api' --lambda-dir /out`);
    expect(arm).toContain(`cp /out/'my app'"'"'s api'/bootstrap /artifact/bootstrap`);
    expect(arm).toContain('--mount=type=cache,target=/src/target');
    expect(x86).toContain("--x86-64 --bin 'api'");
    expect(x86).toContain('FROM scratch AS artifact');
  });

  test('builds Maven projects with Maven rather than converting their build to Gradle', () => {
    const dockerfile = buildJavaArtifactDockerfile({
      javaVersion: 17,
      useMaven: true,
      alpine: false
    });

    expect(dockerfile).toStartWith('FROM public.ecr.aws/sam/build-java17:latest AS build');
    expect(dockerfile).toContain("mvn --batch-mode --no-transfer-progress -pl '.' -am -DskipTests package");
    expect(dockerfile).toContain("'./target/classes/.' /dist/");
    expect(dockerfile).not.toContain('gradle init');
  });
});
