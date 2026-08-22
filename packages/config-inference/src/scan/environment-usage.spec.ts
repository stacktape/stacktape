/**
 * The environment-usage enrichment: which service reads which variable, and what each one is for.
 *
 * The properties these tests protect: a secret the code reads becomes a named, cited need rather
 * than a runtime surprise; a variable links to a dependency only when that link is unambiguous;
 * build-time reads are recognized as such; and test rigs, platform variables and other services'
 * files never leak into a service's list.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from './assemble';
import { environmentProbe } from './probes/environment';
import { languageManifestProbe } from './probes/language-manifests';
import { manifestProbe } from './probes/manifest';

const PROBES = [manifestProbe, environmentProbe];

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-env-usage-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('environment-usage enrichment', () => {
  it('turns source-level reads into classified, cited variable needs', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'orders',
        scripts: { start: 'node src/index.js' },
        dependencies: { express: '^4.19.0' }
      }),
      '.env': [
        'DATABASE_URL=postgres://localhost:5432/app',
        'REDIS_URL=redis://localhost:6379',
        'STRIPE_SECRET_KEY=sk_test_placeholder',
        ''
      ].join('\n'),
      'src/index.js': [
        'const stripeKey = process.env.STRIPE_SECRET_KEY;',
        'const databaseUrl = process.env.DATABASE_URL;',
        'const redisUrl = process.env.REDIS_URL;',
        "const logLevel = process.env.LOG_LEVEL || 'info';",
        'const port = process.env.PORT || 3000;',
        ''
      ].join('\n'),
      // A test rig reading a variable is not the deployed process reading it.
      'test/setup.test.js': "process.env.ONLY_IN_TESTS = '1';"
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const service = facts.services.find((entry) => entry.name === 'orders');
    expect(service).toBeDefined();
    const byName = Object.fromEntries((service?.environmentVariables ?? []).map((entry) => [entry.name, entry]));

    // The secret is the headline: named, classified, and cited by expression — never by whole line.
    expect(byName.STRIPE_SECRET_KEY?.role).toBe('third-party-secret');
    expect(byName.STRIPE_SECRET_KEY?.required).toBe(true);
    expect(byName.STRIPE_SECRET_KEY?.evidence[0]?.file).toBe('src/index.js');
    expect(byName.STRIPE_SECRET_KEY?.evidence[0]?.quote).toBe('process.env.STRIPE_SECRET_KEY');

    // `DATABASE_URL` names no engine, but the repository holds exactly one database.
    expect(byName.DATABASE_URL?.role).toBe('infra-dependency');
    expect(byName.DATABASE_URL?.dependencyName).toBe('mainDatabase');
    expect(byName.REDIS_URL?.role).toBe('infra-dependency');
    expect(byName.REDIS_URL?.dependencyName).toBe('cache');

    // A read with its own fallback is a preference, not a requirement.
    expect(byName.LOG_LEVEL?.role).toBe('runtime-config');
    expect(byName.LOG_LEVEL?.required).toBe(false);

    // Platform-owned and test-only variables never appear.
    expect(byName.PORT).toBeUndefined();
    expect(byName.ONLY_IN_TESTS).toBeUndefined();

    // A service whose own code reads the variable is a proven consumer of the dependency.
    const database = facts.dependencies.find((entry) => entry.name === 'mainDatabase');
    const cache = facts.dependencies.find((entry) => entry.name === 'cache');
    expect(database?.consumedBy).toContain('orders');
    expect(cache?.consumedBy).toContain('orders');
  });

  it('recognizes build-time reads by prefix and by import.meta mechanism', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'storefront',
        scripts: { start: 'node server.js' },
        dependencies: { express: '^4.19.0' }
      }),
      'server.js': [
        'const apiUrl = process.env.NEXT_PUBLIC_API_URL;',
        'const flag = import.meta.env.FEATURE_FLAG;',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const service = facts.services.find((entry) => entry.name === 'storefront');
    const byName = Object.fromEntries((service?.environmentVariables ?? []).map((entry) => [entry.name, entry]));

    expect(byName.NEXT_PUBLIC_API_URL?.role).toBe('build-time');
    // No build-time prefix, but an `import.meta.env` read bakes into the bundle regardless.
    expect(byName.FEATURE_FLAG?.role).toBe('build-time');
  });

  it('attributes reads to the deepest service that owns the file', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'workspace-root', private: true, workspaces: ['apps/*'] }),
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node src/index.js' },
        dependencies: { express: '^4.19.0' }
      }),
      'apps/api/src/index.js': 'const key = process.env.API_ONLY_SECRET_KEY;',
      'apps/web/package.json': JSON.stringify({
        name: 'web',
        scripts: { start: 'node server.js' },
        dependencies: { express: '^4.19.0' }
      }),
      'apps/web/server.js': 'const flag = process.env.WEB_ONLY_FLAG;'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const api = facts.services.find((entry) => entry.name === 'api');
    const web = facts.services.find((entry) => entry.name === 'web');

    expect(api?.environmentVariables.map((entry) => entry.name)).toContain('API_ONLY_SECRET_KEY');
    expect(api?.environmentVariables.map((entry) => entry.name)).not.toContain('WEB_ONLY_FLAG');
    expect(web?.environmentVariables.map((entry) => entry.name)).toContain('WEB_ONLY_FLAG');
    expect(web?.environmentVariables.map((entry) => entry.name)).not.toContain('API_ONLY_SECRET_KEY');
  });

  it('never links a variable to a dependency it cannot name unambiguously', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' },
        dependencies: { express: '^4.19.0' }
      }),
      // No database dependency exists anywhere in this repository.
      'index.js': 'const url = process.env.DATABASE_URL;'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const service = facts.services.find((entry) => entry.name === 'api');
    const variable = service?.environmentVariables.find((entry) => entry.name === 'DATABASE_URL');

    // The schema requires `infra-dependency` to name its supplier, so with nothing to point at the
    // read degrades to configuration: an honest record, never a guessed link.
    expect(variable).toBeDefined();
    expect(variable?.role).toBe('runtime-config');
    expect(variable?.dependencyName).toBeUndefined();
  });

  it('reads Rails ERB environment access from YAML configuration', async () => {
    root = await makeRepo({
      Gemfile: 'gem "rails"\ngem "pg"\ngem "redis"\n',
      'config/database.yml': 'production:\n  url: <%= ENV["DATABASE_URL"] %>\n',
      'config/cable.yml': 'production:\n  url: <%= ENV.fetch("REDIS_URL", "redis://localhost") %>\n'
    });
    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe]
    });

    expect(facts.services[0]?.environmentVariables).toContainEqual(
      expect.objectContaining({ name: 'DATABASE_URL', role: 'infra-dependency', required: true })
    );
    expect(facts.services[0]?.environmentVariables).toContainEqual(
      expect.objectContaining({ name: 'REDIS_URL', role: 'infra-dependency', required: false })
    );
  });
});
