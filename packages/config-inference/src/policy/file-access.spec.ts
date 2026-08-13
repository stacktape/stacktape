import { describe, expect, it } from 'bun:test';
import {
  classifyFileAccess,
  extractEnvironmentVariableNames,
  isSkippedDirectoryName,
  isWithinRoots
} from './file-access';

describe('classifyFileAccess', () => {
  it('reads ordinary source and configuration files', () => {
    expect(classifyFileAccess('src/index.ts')).toBe('read');
    expect(classifyFileAccess('docker-compose.yml')).toBe('read');
    expect(classifyFileAccess('apps/api/Dockerfile')).toBe('read');
  });

  it('gives every environment file names-only access, example files included', () => {
    // The exception people reach for is `.env.example`. It is deliberately absent: example files
    // pick up real values by accident, and the names are the whole signal anyway.
    for (const path of ['.env', '.env.local', '.env.production', '.env.example', 'apps/web/.env.sample']) {
      expect(classifyFileAccess(path)).toBe('names-only');
    }
  });

  it('blocks credential material by extension, basename, and prefix', () => {
    for (const path of [
      'certs/server.pem',
      'keys/private.key',
      'android/release.keystore',
      'deploy/id_rsa',
      'deploy/id_ed25519.pub',
      '.npmrc',
      'ops/credentials'
    ]) {
      expect(classifyFileAccess(path)).toBe('blocked');
    }
  });

  it('blocks anything inside a credential directory', () => {
    expect(classifyFileAccess('.ssh/config')).toBe('blocked');
    expect(classifyFileAccess('home/.aws/config')).toBe('blocked');
  });

  it('blocks files inside skipped directories at any depth', () => {
    expect(classifyFileAccess('node_modules/left-pad/index.js')).toBe('blocked');
    expect(classifyFileAccess('apps/web/.next/server/page.js')).toBe('blocked');
  });
});

describe('isSkippedDirectoryName', () => {
  it('skips dependency, build, and credential directories', () => {
    for (const name of ['node_modules', 'dist', '.git', 'target', '.ssh', '.aws']) {
      expect(isSkippedDirectoryName(name)).toBe(true);
    }
  });

  it('does not skip ordinary source directories', () => {
    for (const name of ['src', 'apps', 'packages', 'lib']) {
      expect(isSkippedDirectoryName(name)).toBe(false);
    }
  });
});

describe('extractEnvironmentVariableNames', () => {
  it('returns names and never values', () => {
    const contents = [
      '# a comment',
      '',
      'DATABASE_URL=postgres://<DATABASE_USER>:<DATABASE_PASSWORD>@db.example.com:5432/app',
      'export REDIS_URL="redis://localhost:6379"',
      "STRIPE_SECRET_KEY='sk_live_abc123'",
      'EMPTY=',
      'not a variable line',
      '=novalue'
    ].join('\n');

    const names = extractEnvironmentVariableNames(contents);

    expect(names).toEqual(['DATABASE_URL', 'REDIS_URL', 'STRIPE_SECRET_KEY', 'EMPTY']);
    const serialized = names.join(',');
    expect(serialized).not.toContain('hunter2');
    expect(serialized).not.toContain('sk_live_abc123');
    expect(serialized).not.toContain('6379');
  });

  it('de-duplicates repeated declarations', () => {
    expect(extractEnvironmentVariableNames('PORT=3000\nPORT=4000')).toEqual(['PORT']);
  });

  it('ignores lines whose name is not a valid identifier', () => {
    expect(extractEnvironmentVariableNames('my-var=1\n9LIVES=1\nOK_NAME=1')).toEqual(['OK_NAME']);
  });

  it('does not mistake the inside of a multi-line value for declarations', () => {
    // Without quote tracking a wrapped secret emits fragments of itself as "names" — the exact leak
    // this function exists to prevent.
    const contents = [
      'PRIVATE_KEY="-----BEGIN PRIVATE\u0020KEY-----',
      'AKIAIOSFODNN7EXAMPLE=not-a-variable',
      'MIIEvQIBADANBgkqhkiG9w0=',
      '-----END PRIVATE KEY-----"',
      'AFTER=1'
    ].join('\n');

    expect(extractEnvironmentVariableNames(contents)).toEqual(['PRIVATE_KEY', 'AFTER']);
  });

  it('handles a single-line quoted value normally', () => {
    expect(extractEnvironmentVariableNames('A="one line"\nB=2')).toEqual(['A', 'B']);
  });
});

describe('classifyFileAccess is not defeated by a rename or by letter case', () => {
  it('treats environment files case-insensitively', () => {
    // Windows and macOS filesystems are case-insensitive, so `.ENV` is the same file as `.env`.
    for (const path of ['.ENV', '.Env.Production', 'config/PROD.env', '.envrc']) {
      expect(classifyFileAccess(path)).toBe('names-only');
    }
  });

  it('blocks credential carriers that look like ordinary configuration', () => {
    for (const path of ['.yarnrc.yml', 'gradle.properties', 'service-account.json', 'terraform.tfvars', 'kubeconfig']) {
      expect(classifyFileAccess(path)).toBe('blocked');
    }
  });

  it('blocks credential extensions regardless of case', () => {
    expect(classifyFileAccess('certs/SERVER.PEM')).toBe('blocked');
  });

  it('still reads an ordinary application config.json', () => {
    // Blocking this outright would cost real signal; the Docker credential store is handled by
    // skipping the `.docker` directory instead.
    expect(classifyFileAccess('src/config.json')).toBe('read');
    expect(classifyFileAccess('.docker/config.json')).toBe('blocked');
  });
});

describe('isWithinRoots', () => {
  it('treats the repository root as containing everything', () => {
    expect(isWithinRoots('apps/api/src/index.ts', ['.'])).toBe(true);
  });

  it('matches a root exactly and by directory prefix', () => {
    expect(isWithinRoots('apps/api', ['apps/api'])).toBe(true);
    expect(isWithinRoots('apps/api/src/index.ts', ['apps/api'])).toBe(true);
  });

  it('does not let a sibling with a shared prefix pass', () => {
    expect(isWithinRoots('apps/api-internal/src/index.ts', ['apps/api'])).toBe(false);
  });

  it('rejects paths outside every declared root', () => {
    expect(isWithinRoots('packages/ui/index.ts', ['apps/api', 'apps/web'])).toBe(false);
  });
});
