/**
 * Reading a Procfile.
 *
 * The case that motivated this: a Django project with a Procfile and a `requirements.txt` produced
 * no services at all, because the only probe that could find one read `package.json`. `init` told
 * the user their repository had nothing to deploy.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
import { languageManifestProbe } from './language-manifests';
import { manifestProbe } from './manifest';
import { procfileProbe } from './procfile';

const PROBES = [manifestProbe, procfileProbe];

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-procfile-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('the Procfile probe', () => {
  it('gives a Python project services it would otherwise not have at all', async () => {
    root = await makeRepo({
      'requirements.txt': 'Django==5.0\ngunicorn==22.0\n',
      'manage.py': 'import django\n',
      Procfile: [
        'web: gunicorn myapp.wsgi --bind 0.0.0.0:8000',
        'worker: celery -A myapp worker',
        'release: python manage.py migrate',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services.map((service) => service.name)).toEqual(['web', 'worker']);
    expect(facts.services[0]).toMatchObject({
      language: 'python',
      exposesHttp: true,
      startCommand: 'gunicorn myapp.wsgi --bind 0.0.0.0:8000'
    });
    // Only `web` receives HTTP. A worker with a load balancer in front of it is money for nothing.
    expect(facts.services[1]).toMatchObject({ exposesHttp: false, startCommand: 'celery -A myapp worker' });
    expect(facts.migrations[0]).toMatchObject({ tool: 'django', command: 'python manage.py migrate', runsAt: 'ci' });
  });

  it('composes the worker as a worker, not a second web service', async () => {
    root = await makeRepo({
      'requirements.txt': 'Django==5.0\n',
      Procfile: 'web: gunicorn myapp.wsgi\nworker: celery -A myapp worker\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const { config } = composeConfig({ facts, projectName: 'demo' });

    expect(config.resources.web?.type).toBe('web-service');
    expect(config.resources.worker?.type).toBe('worker-service');
  });

  it('does not turn one application into two when a manifest already described it', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'api', scripts: { start: 'node index.js' } }),
      Procfile: 'web: node dist/server.js\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    // The `web` process and the manifest are the same thing. Two entries here would deploy the
    // application twice and bill for both.
    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]?.name).toBe('api');
    expect(facts.services[0]?.startCommand).toBe('node dist/server.js');
  });

  it('isolates one safe migration from a release chain without retaining redirects or seeds', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node dist/main.js', 'migration:run': 'typeorm migration:run' }
      }),
      Procfile: [
        'web: npm run start',
        "release: echo '' > .env && npm run migration:run && npm run seed:run:relational",
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const { config, gaps } = composeConfig({ facts, projectName: 'demo' });

    expect(facts.migrations).toEqual([
      expect.objectContaining({ serviceName: 'api', command: 'npm run migration:run', runsAt: 'ci' })
    ]);
    expect(config.scripts?.migrateDatabase?.properties.executeCommand).toBe('npm run migration:run');
    expect(config.hooks?.afterDeploy).toEqual([{ scriptName: 'migrateDatabase' }]);
    expect(JSON.stringify({ facts, config, gaps })).not.toContain("echo '' > .env");
    expect(JSON.stringify({ facts, config, gaps })).not.toContain('seed:run:relational');
  });

  it('ignores comments and blank lines rather than reading them as processes', async () => {
    root = await makeRepo({
      'requirements.txt': 'flask\n',
      Procfile: '# the web process\n\nweb: flask run\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services.map((service) => service.name)).toEqual(['web']);
  });

  it('keeps inline environment names but never their values', async () => {
    root = await makeRepo({
      'requirements.txt': 'flask\n',
      Procfile: 'web: SESSION_SECRET=do-not-store LOG_LEVEL=debug flask run\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services[0]).toMatchObject({
      startCommand: 'flask run',
      environmentVariables: [
        expect.objectContaining({ name: 'SESSION_SECRET', role: 'third-party-secret', hasDeclaredValue: true }),
        expect.objectContaining({ name: 'LOG_LEVEL', role: 'runtime-config', hasDeclaredValue: true })
      ]
    });
    expect(JSON.stringify(facts)).not.toContain('do-not-store');
    expect(JSON.stringify(facts)).not.toContain('debug');
  });

  it('keeps every cross-reference intact when two probes name the same service differently', async () => {
    // The language probe calls this application `orders` (from pyproject); the Procfile calls the
    // same directory `web`. The merge keeps `orders` — and everything the Procfile said about `web`
    // has to follow it there, or the release-phase migration dangles as a blocking problem and the
    // database attaches to nothing.
    root = await makeRepo({
      'pyproject.toml': '[project]\nname = "orders"\n',
      'requirements.txt': 'Django==5.0\ngunicorn==22.0\npsycopg2==2.9\n',
      Procfile: 'web: gunicorn myapp.wsgi\nworker: celery -A myapp worker\nrelease: python manage.py migrate\n'
    });

    // The same order the mission runs them in: the language probe names the application before the
    // Procfile describes its processes.
    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, languageManifestProbe, procfileProbe]
    });
    const { config } = composeConfig({ facts, projectName: 'demo' });

    expect(facts.services.map((service) => service.name).toSorted()).toEqual(['orders', 'worker']);
    // One migration, not two: the language probe proved the tool exists, the Procfile showed when
    // it runs, and the observed timing wins over `unknown`.
    expect(facts.migrations).toHaveLength(1);
    expect(facts.migrations[0]).toMatchObject({ serviceName: 'orders', runsAt: 'ci' });
    // One codebase, two processes: the worker needs the database exactly as much as the web does.
    const properties = config.resources.orders?.properties as { connectTo?: string[] };
    const workerProperties = config.resources.worker?.properties as { connectTo?: string[] };
    expect(properties.connectTo).toEqual(['mainDatabase']);
    expect(workerProperties.connectTo).toEqual(['mainDatabase']);
  });
});
