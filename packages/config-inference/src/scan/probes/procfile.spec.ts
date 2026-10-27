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
import { serverEntrypointProbe } from './server-entrypoint';

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
    expect(facts.services[1]).toMatchObject({
      exposesHttp: false,
      startCommand: 'celery -A myapp worker'
    });
    expect(facts.migrations[0]).toMatchObject({
      tool: 'django',
      command: 'python manage.py migrate',
      runsAt: 'ci'
    });
  });

  it('does not deploy a Procfile line that only starts a datastore', async () => {
    root = await makeRepo({
      Gemfile: 'source "https://rubygems.org"\ngem "rails"\ngem "resque"\n',
      Procfile: [
        'web: bundle exec thrust bin/start-app',
        'redis: redis-server config/redis.conf',
        'workers: FORK_PER_JOB=false bundle exec resque-pool',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services.map((service) => service.startCommand).toSorted()).toEqual([
      'bundle exec resque-pool',
      'bundle exec thrust bin/start-app'
    ]);
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
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' }
      }),
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
        scripts: {
          start: 'node dist/main.js',
          'migration:run': 'typeorm migration:run'
        }
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
      expect.objectContaining({
        serviceName: 'api',
        command: 'npm run migration:run',
        runsAt: 'ci'
      })
    ]);
    expect(config.scripts?.migrateDatabase?.properties.executeCommand).toBe('npm run migration:run');
    expect(config.hooks?.afterDeploy).toEqual([{ scriptName: 'migrateDatabase' }]);
    expect(JSON.stringify({ facts, config, gaps })).not.toContain("echo '' > .env");
    expect(JSON.stringify({ facts, config, gaps })).not.toContain('seed:run:relational');
  });

  it('treats a conventionally named migrate process as a lifecycle hook, not a paid worker', async () => {
    root = await makeRepo({
      'requirements.txt': 'fastapi==0.116\nalembic==1.16\n',
      Procfile: 'web: uvicorn app.main:app\nworker: celery -A app worker\nmigrate: alembic upgrade head\n'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [procfileProbe]
    });

    expect(facts.services.map((service) => service.name)).toEqual(['web', 'worker']);
    expect(facts.migrations).toContainEqual(
      expect.objectContaining({
        serviceName: 'web',
        tool: 'alembic',
        command: 'alembic upgrade head',
        runsAt: 'ci'
      })
    );
  });

  it('ignores comments and blank lines rather than reading them as processes', async () => {
    root = await makeRepo({
      'requirements.txt': 'flask\n',
      Procfile: '# the web process\n\nweb: flask run\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services.map((service) => service.name)).toEqual(['web']);
  });

  it('keeps safe operational defaults but never inline secret values', async () => {
    root = await makeRepo({
      'requirements.txt': 'flask\n',
      Procfile: 'web: SESSION_SECRET=do-not-store LOG_LEVEL=debug flask run\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services[0]).toMatchObject({
      startCommand: 'flask run',
      environmentVariables: [
        expect.objectContaining({
          name: 'SESSION_SECRET',
          role: 'third-party-secret',
          hasDeclaredValue: true
        }),
        expect.objectContaining({
          name: 'LOG_LEVEL',
          role: 'runtime-config',
          hasDeclaredValue: true,
          safeLiteralValue: 'debug'
        })
      ]
    });
    expect(JSON.stringify(facts)).not.toContain('do-not-store');
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
    expect(facts.migrations[0]).toMatchObject({
      serviceName: 'orders',
      runsAt: 'ci'
    });
    // One codebase, two processes: the worker needs the database exactly as much as the web does.
    const properties = config.resources.orders?.properties as {
      connectTo?: string[];
    };
    const workerProperties = config.resources.worker?.properties as {
      connectTo?: string[];
    };
    expect(properties.connectTo).toEqual(['mainDatabase']);
    expect(workerProperties.connectTo).toEqual(['mainDatabase']);
  });

  // r2cc: `api/Procfile` was ignored, so init composed a bare `uvicorn` command and nothing ran Alembic.
  it("reads a service directory's Procfile and keeps the migration it runs before the server", async () => {
    root = await makeRepo({
      'api/requirements.txt': 'fastapi==0.115\nuvicorn==0.32\npsycopg[binary]==3.2\nalembic==1.14\n',
      'api/main.py':
        'import os\nfrom fastapi import FastAPI\napp = FastAPI()\nDATABASE_URL = os.environ["DATABASE_URL"]\n',
      'api/Procfile':
        'web: alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}\nworker: python jobs.py\n'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, serverEntrypointProbe, procfileProbe]
    });
    const { config, gaps } = composeConfig({ facts, projectName: 'demo' });

    // The web process folds into the FastAPI service the entrypoint probe found there; the worker keeps its own name.
    expect(facts.services.map((service) => service.name).toSorted()).toEqual(['api', 'api-worker']);
    expect(facts.migrations).toEqual([
      expect.objectContaining({ serviceName: 'api', tool: 'alembic', runsAt: 'service-startup' })
    ]);
    expect(config.resources.api?.properties).toMatchObject({
      packaging: {
        properties: { startCommand: 'alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}' }
      },
      port: 8000
    });
    // The app migrates on every start, so a deploy hook would run it twice.
    expect(config.hooks).toBeUndefined();
    expect(gaps.filter((gap) => gap.subject.endsWith('.migrations'))).toEqual([]);
  });

  it('reports a migration tool in the dependencies that nothing runs', async () => {
    root = await makeRepo({
      'api/requirements.txt': 'fastapi==0.115\nuvicorn==0.32\npsycopg[binary]==3.2\nalembic==1.14\n',
      'api/main.py':
        'import os\nfrom fastapi import FastAPI\napp = FastAPI()\nDATABASE_URL = os.environ["DATABASE_URL"]\n'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, serverEntrypointProbe, procfileProbe]
    });
    const { config, gaps } = composeConfig({ facts, projectName: 'demo' });

    expect(facts.migrations).toEqual([
      expect.objectContaining({
        serviceName: 'api',
        tool: 'alembic',
        command: 'alembic upgrade head',
        runsAt: 'unknown'
      })
    ]);
    expect(config.hooks).toBeUndefined();
    expect(gaps.filter((gap) => gap.subject === 'api.migrations')).toEqual([
      {
        subject: 'api.migrations',
        message:
          'api depends on Alembic, but nothing we found runs "alembic upgrade head". Run it before the server starts (at the start of api\'s start command), or add it as a script and an afterDeploy hook.'
      }
    ]);
  });

  it('counts a start script that migrates as running the migration', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'shop',
        scripts: { start: 'prisma migrate deploy && node server.js' },
        dependencies: { express: '^4.21.0', '@prisma/client': '^5.0.0' },
        devDependencies: { prisma: '^5.0.0' }
      }),
      'server.js': "require('express')().listen(process.env.PORT);\n"
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [manifestProbe, procfileProbe] });
    const { gaps } = composeConfig({ facts, projectName: 'demo' });

    expect(facts.migrations).toEqual([expect.objectContaining({ tool: 'prisma', runsAt: 'service-startup' })]);
    expect(gaps.filter((gap) => gap.subject.endsWith('.migrations'))).toEqual([]);
  });

  it('ignores a Procfile in a directory that is not a service of its own', async () => {
    // Outline's `server/collaboration/Procfile` starts the root application for a second Heroku app.
    root = await makeRepo({
      'package.json': JSON.stringify({ name: 'outline', scripts: { start: 'node build/server/index.js' } }),
      Procfile: 'web: yarn start --services=web,websockets,collaboration\nworker: yarn start --services=worker\n',
      'server/collaboration/Procfile': 'web: yarn start --services=collaboration\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services.map((service) => service.name).toSorted()).toEqual(['outline', 'worker']);
  });

  it('does not report a migration a script in the repository runs', async () => {
    root = await makeRepo({
      'api/requirements.txt': 'fastapi==0.115\nuvicorn==0.32\nalembic==1.14\n',
      'api/main.py': 'from fastapi import FastAPI\napp = FastAPI()\n',
      // fastapi-full-stack runs this before the server from its Compose file.
      'api/scripts/prestart.sh': '#! /usr/bin/env bash\nset -e\nalembic upgrade head\n'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe, serverEntrypointProbe, procfileProbe]
    });
    const { gaps } = composeConfig({ facts, projectName: 'demo' });

    expect(facts.migrations).toEqual([expect.objectContaining({ tool: 'alembic', runsAt: 'manual' })]);
    expect(gaps.filter((gap) => gap.subject.endsWith('.migrations'))).toEqual([]);
  });

  it('does not report a migration when the container starts through a script init cannot read', async () => {
    // Campfire's `CMD ["bin/boot"]` runs `bin/rails db:prepare`; init does not read the root `bin/` directory.
    root = await makeRepo({
      Gemfile: 'source "https://rubygems.org"\ngem "rails", "~> 8.0"\ngem "puma"\n',
      Dockerfile: 'FROM ruby:3.4\nCOPY . .\nCMD ["bin/boot"]\n',
      'bin/boot': '#!/usr/bin/env bash\n./bin/rails db:prepare\nexec bin/thrust bin/rails server\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [languageManifestProbe, procfileProbe] });
    const { gaps } = composeConfig({ facts, projectName: 'demo' });

    expect(facts.migrations).toEqual([expect.objectContaining({ tool: 'rails', runsAt: 'manual' })]);
    expect(gaps.filter((gap) => gap.subject.endsWith('.migrations'))).toEqual([]);
  });

  // #368 review: deploy hooks run from the project root, where `manage.py` is not.
  it("runs a service directory's release migration from that directory", async () => {
    root = await makeRepo({
      'api/requirements.txt': 'Django==5.0\ngunicorn==22.0\npsycopg2==2.9\n',
      'api/manage.py': 'import django\n',
      'api/Procfile': 'web: gunicorn api.wsgi\nrelease: python manage.py migrate\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [languageManifestProbe, procfileProbe] });
    const { config } = composeConfig({ facts, projectName: 'demo' });

    expect(facts.migrations).toEqual([
      expect.objectContaining({
        serviceName: 'api',
        runsAt: 'ci',
        command: 'python manage.py migrate',
        directory: 'api'
      })
    ]);
    expect(config.scripts?.migrateDatabase).toEqual({
      type: 'local-script',
      properties: { executeCommand: 'python manage.py migrate', cwd: 'api' }
    });
    expect(config.hooks).toEqual({ afterDeploy: [{ scriptName: 'migrateDatabase' }] });
  });

  it('names two service directories with the same basename apart', async () => {
    root = await makeRepo({
      'apps/a/api/requirements.txt': 'flask==3.0\n',
      'apps/a/api/Procfile': 'web: gunicorn app:app\nworker: python worker.py\n',
      'apps/b/api/requirements.txt': 'flask==3.0\n',
      'apps/b/api/Procfile': 'web: gunicorn app:app\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [procfileProbe] });

    expect(facts.services.map((service) => [service.name, service.path]).toSorted()).toEqual([
      ['apps-a-api', 'apps/a/api'],
      ['apps-a-api-worker', 'apps/a/api'],
      ['apps-b-api', 'apps/b/api']
    ]);
  });

  it('still reports the migration when the container only starts through tini, or another package has a migrate script', async () => {
    root = await makeRepo({
      'api/requirements.txt': 'fastapi==0.115\nuvicorn==0.32\nalembic==1.14\n',
      'api/main.py': 'from fastapi import FastAPI\napp = FastAPI()\n',
      'api/Dockerfile': 'FROM python:3.13\nENTRYPOINT ["/usr/bin/tini", "--"]\nCMD ["uvicorn", "main:app"]\n',
      // The frontend's own `migrate` script runs its own tool, not the API's Alembic.
      'web/package.json': JSON.stringify({ name: 'web', scripts: { 'db:migrate': 'prisma migrate deploy' } })
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, languageManifestProbe, serverEntrypointProbe, procfileProbe]
    });
    const { gaps } = composeConfig({ facts, projectName: 'demo' });

    expect(facts.migrations).toEqual([expect.objectContaining({ serviceName: 'api', runsAt: 'unknown' })]);
    expect(gaps.map((gap) => gap.subject)).toContain('api.migrations');
  });
});
