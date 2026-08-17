import { describe, expect, test } from 'bun:test';
import {
  buildDotnetArtifactDockerfile,
  buildEsDockerfile,
  buildGoArtifactDockerfile,
  buildJavaArtifactDockerfile,
  buildJavaDockerfile,
  buildPhpDockerfile,
  buildPythonArtifactDockerfile,
  buildPythonDockerfile,
  buildRubyArtifactDockerfile,
  buildRubyDockerfile
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

  test('derives a Python ASGI module from the artifact root, not from the dependency filename', () => {
    const dockerfile = buildPythonDockerfile({
      pythonVersion: 3.12,
      entryfilePath: 'C:/project/service/api/main.py',
      sourceRootPath: 'C:/project/service',
      runAppAs: 'ASGI',
      handler: 'app'
    });

    expect(dockerfile).toContain("python -m uvicorn 'api.main:app'");
    expect(dockerfile).toContain('exec python -m uvicorn');
  });

  test('execs Java and Python servers as PID 1 for graceful container shutdown', () => {
    expect(
      buildJavaDockerfile({
        javaVersion: 21,
        entryfilePath: 'src/main/java/example/Main.java'
      })
    ).toContain('exec java -classpath');
    expect(
      buildPythonDockerfile({
        pythonVersion: 3.13,
        entryfilePath: '/src/api.py',
        sourceRootPath: '/src',
        runAppAs: 'WSGI',
        handler: 'app'
      })
    ).toContain('exec python -m gunicorn');
  });

  test('exports locked uv dependencies before installing them', () => {
    const dockerfile = buildPythonArtifactDockerfile({
      pythonVersion: 3.12,
      minify: false,
      alpine: true
    });

    expect(dockerfile).toMatch(/uv-lock" \]; then\s+uv export --locked --no-dev --no-emit-project/);
  });

  test('minifies only application code before dependencies are installed', () => {
    const dockerfile = buildPythonArtifactDockerfile({
      pythonVersion: 3.14,
      minify: true,
      alpine: false
    });

    expect(dockerfile.indexOf('RUN pyminify . --in-place')).toBeLessThan(
      dockerfile.indexOf('uv pip install --system --target .')
    );
  });

  test('builds native Python and Ruby Lambda dependencies in runtime-compatible SAM images', () => {
    const python = buildPythonArtifactDockerfile({
      pythonVersion: 3.14,
      minify: false,
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

  test('does not reinstall already prepared Ruby and PHP dependencies in runtime images', () => {
    const ruby = buildRubyDockerfile({
      rubyVersion: 3.3,
      entryfilePath: 'src/app.rb',
      alpine: true
    });
    const php = buildPhpDockerfile({
      phpVersion: 8.3,
      entryfilePath: 'public/index.php',
      alpine: true
    });

    expect(ruby).not.toContain('bundle install');
    expect(ruby).not.toContain('build-base');
    expect(php).not.toContain('composer install');
    expect(php).not.toContain('FROM composer');
    expect(php).not.toContain('git unzip');
    expect(ruby).toContain('exec bundle exec ruby \\"$0\\"');
    expect(ruby).toContain('"src/app.rb"');
    expect(php).toContain('CMD ["php", "public/index.php"]');
  });

  test('supports the Bundler gems.rb manifest and safely passes Ruby entrypoints with spaces', () => {
    const artifact = buildRubyArtifactDockerfile({
      rubyVersion: 4,
      target: 'lambda'
    });
    const image = buildRubyDockerfile({
      rubyVersion: 4,
      entryfilePath: 'src/my worker.rb'
    });

    expect(artifact).toContain('[ -f Gemfile ] || [ -f gems.rb ]');
    expect(artifact).toContain("bundle config set --local without 'development test'");
    expect(artifact).toContain('BUNDLE_GEMFILE="$gemfile" bundle install');
    expect(artifact).not.toContain('bundle install --without');
    expect(image).toContain('BUNDLE_GEMFILE=gems.rb bundle exec ruby');
    expect(image).toContain('"src/my worker.rb"');
  });

  test('builds Maven projects with Maven rather than converting their build to Gradle', () => {
    const dockerfile = buildJavaArtifactDockerfile({
      javaVersion: 17,
      useMaven: true,
      alpine: false
    });

    expect(dockerfile).toContain('maven:3.9-eclipse-temurin-17');
    expect(dockerfile).toContain("mvn --batch-mode --no-transfer-progress -pl '.' -am -DskipTests package");
    expect(dockerfile).toContain("'./target/classes/.' /dist/");
    expect(dockerfile).not.toContain('gradle init');
  });
});
