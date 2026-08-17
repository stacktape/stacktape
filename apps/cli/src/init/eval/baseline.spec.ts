/**
 * The no-agent baseline, scored.
 *
 * These run in CI: no tokens, no network, seconds not minutes. They pin what the deterministic half
 * achieves on its own, which is both the floor the product ships with when nobody has a coding agent
 * installed and the number every provider has to beat to be worth the user's tokens.
 *
 * The fixtures are shapes this product actually meets, including the ones designed to catch
 * over-eagerness — an adversarial repository that invites an invented dependency, and a library with
 * nothing to deploy at all.
 */

import { describe, expect, it } from 'bun:test';
import { runEvalCase, summarise, type EvalCase, type EvalScore } from './harness';

const CASES: EvalCase[] = [
  {
    name: 'express + postgres + redis',
    files: {
      'package.json': JSON.stringify({
        name: 'orders',
        scripts: { build: 'tsc -p .', start: 'node dist/index.js' },
        dependencies: { express: '^5.0.0', pg: '^8.11.0', ioredis: '^5.4.0' }
      }),
      'package-lock.json': '{}',
      'src/index.ts': 'import express from "express";\nconst app = express();\napp.listen(4000);'
    },
    expect: {
      dependencyKinds: ['postgres', 'redis'],
      resources: { orders: 'web-service', mainDatabase: 'relational-database', cache: 'redis-cluster' },
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'next.js app',
    files: {
      'package.json': JSON.stringify({
        name: 'storefront',
        scripts: { build: 'next build', start: 'next start' },
        dependencies: { next: '^15.0.0', react: '^19.0.0' }
      }),
      'pnpm-lock.yaml': ''
    },
    expect: { resources: { storefront: 'nextjs-web' }, deployable: true, maxQuestions: 0 }
  },
  {
    name: 'monorepo with a web app and a worker',
    files: {
      'package.json': JSON.stringify({ name: 'acme', private: true, workspaces: ['apps/*'] }),
      'pnpm-lock.yaml': '',
      'apps/web/package.json': JSON.stringify({
        name: '@acme/web',
        scripts: { build: 'next build', start: 'next start' },
        dependencies: { next: '^15.0.0' }
      }),
      'apps/worker/package.json': JSON.stringify({
        name: '@acme/worker',
        scripts: { start: 'node index.js' },
        dependencies: { bullmq: '^5.0.0' }
      })
    },
    expect: {
      // BullMQ uses Redis as its queue backend; it is not evidence for an AWS SQS queue.
      dependencyKinds: ['redis'],
      resources: { web: 'nextjs-web', worker: 'worker-service' },
      deployable: true
    }
  },
  {
    name: 'live supabase database is never replaced',
    files: {
      'package.json': JSON.stringify({
        name: 'app',
        scripts: { start: 'node index.js' },
        dependencies: { pg: '^8.0.0' }
      }),
      '.env': 'DATABASE_URL=postgres://\${DATABASE_USER}:\${DATABASE_PASSWORD}@db.abc.supabase.co:5432/postgres\n'
    },
    expect: {
      dependencyKinds: ['postgres'],
      // Nothing is created for it — but the configuration is still complete and deployable, with
      // the decision recorded where the user can see and reverse it.
      deployable: true,
      assumesKinds: ['external-database-disposition']
    }
  },
  {
    name: 'adversarial: mentions of caching must not invent a cache',
    files: {
      'package.json': JSON.stringify({
        name: 'blog',
        scripts: { start: 'node server.js' },
        dependencies: { express: '^5.0.0' }
      }),
      'README.md': '# Blog\n\nWe use aggressive caching and a redis-like in-memory store for sessions.\n',
      'src/cache.ts':
        '// A simple in-process cache. Not Redis.\nconst cache = new Map<string, string>();\nexport default cache;'
    },
    expect: {
      absentDependencyKinds: ['redis', 'postgres'],
      resources: { blog: 'web-service' },
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'library with nothing to deploy',
    files: {
      'package.json': JSON.stringify({ name: 'utils', main: 'dist/index.js', devDependencies: { typescript: '^5' } }),
      'src/index.ts': 'export const add = (a: number, b: number) => a + b;'
    },
    // Nothing to deploy at all, which is the one thing that makes a composition undeployable.
    expect: { resources: {}, deployable: false, maxQuestions: 0 }
  },
  {
    name: 'django with a procfile',
    files: {
      'pyproject.toml': '[project]\nname = "orders"\n',
      'requirements.txt': 'Django==5.0\ngunicorn==22.0\npsycopg2-binary==2.9.9\n',
      'manage.py': 'import django\n',
      Procfile: 'web: gunicorn orders.wsgi\nworker: celery -A orders worker\nrelease: python manage.py migrate\n'
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { orders: 'web-service', worker: 'worker-service', mainDatabase: 'relational-database' },
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'rails with sidekiq and a compose file',
    files: {
      Gemfile: 'source "https://rubygems.org"\ngem "rails", "~> 7.1"\ngem "pg"\ngem "puma"\ngem "sidekiq"\n',
      Procfile: 'web: bundle exec puma\nworker: bundle exec sidekiq\nrelease: bin/rails db:migrate\n',
      'docker-compose.yml': 'services:\n  db:\n    image: postgres:15\n  redis:\n    image: redis:7\n'
    },
    expect: {
      dependencyKinds: ['postgres', 'redis'],
      // Sidekiq keeps its jobs in Redis. An SQS queue here would be a resource the application
      // never connects to, billed monthly, looking deliberate.
      absentDependencyKinds: ['queue'],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'go service on second-major-version libraries',
    files: {
      'go.mod': [
        'module example.com/orders-api',
        'go 1.22',
        'require (',
        '\tgithub.com/go-chi/chi/v5 v5.0.12',
        '\tgithub.com/redis/go-redis/v9 v9.5.1',
        '\tgithub.com/lib/pq v1.10.9',
        ')',
        ''
      ].join('\n'),
      'main.go': 'package main\n\nfunc main() {}\n'
    },
    expect: {
      dependencyKinds: ['postgres', 'redis'],
      resources: { ordersApi: 'web-service' },
      deployable: true,
      // Nothing in this repository states how the service starts — `main.go` proves no listen
      // call, and Go projects write no start script. That used to be an invisible blocking
      // completeness finding riding under a green result; the convention pack now resolves it as
      // a visible decided-for-you card recommending `go run .`.
      assumesKinds: ['command-unknown'],
      maxQuestions: 1
    }
  },
  {
    name: 'project that already deploys with the serverless framework',
    files: {
      'package.json': JSON.stringify({
        name: 'legacy-api',
        scripts: { start: 'node index.js' },
        dependencies: { express: '^5.0.0' }
      }),
      'serverless.yml': 'service: legacy-api\nprovider:\n  name: aws\n'
    },
    // Still composed, still deployable — but never silently. The existing stack is somebody's
    // production, and the gap saying so is checked by the probe's own spec.
    expect: { resources: { legacyApi: 'web-service' }, deployable: true, maxQuestions: 0 }
  },
  {
    name: 'express reading its variables, wired to the resources they mean',
    files: {
      'package.json': JSON.stringify({
        name: 'orders',
        scripts: { start: 'node src/index.js' },
        dependencies: { express: '^5.0.0', pg: '^8.11.0' }
      }),
      'package-lock.json': '{}',
      'src/index.js': [
        'const databaseUrl = process.env.DATABASE_URL;',
        'const stripeKey = process.env.STRIPE_SECRET_KEY;',
        ''
      ].join('\n'),
      '.env': 'DATABASE_URL=postgres://localhost:5432/app\n'
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { orders: 'web-service', mainDatabase: 'relational-database' },
      // The application's own names, pointed at what supplies them — the difference between
      // infrastructure that exists and an application that works.
      serviceEnvironment: [
        { resource: 'orders', name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" },
        { resource: 'orders', name: 'STRIPE_SECRET_KEY', value: "$Secret('stripe_secret_key')" }
      ],
      deployable: true,
      maxQuestions: 0
    }
  },
  {
    name: 'rails with a release-phase migration',
    files: {
      Gemfile: "source 'https://rubygems.org'\ngem 'rails'\ngem 'pg'\n",
      Procfile: 'web: bundle exec puma -C config/puma.rb\nrelease: bundle exec rails db:migrate\n'
    },
    expect: {
      dependencyKinds: ['postgres'],
      // The release phase is the repository saying "run this on deploy", and the emitted script is
      // the hook that actually does — the first-deploy failure class for Heroku-shaped apps.
      scriptNames: ['migrateDatabase'],
      deployable: true
    }
  },
  {
    name: 'spring boot with nothing written down but the convention',
    files: {
      'pom.xml': [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<project>',
        '  <groupId>com.example</groupId>',
        '  <artifactId>orders</artifactId>',
        '  <dependencies>',
        '    <dependency>',
        '      <groupId>org.springframework.boot</groupId>',
        '      <artifactId>spring-boot-starter-web</artifactId>',
        '    </dependency>',
        '  </dependencies>',
        '</project>',
        ''
      ].join('\n'),
      mvnw: '#!/bin/sh\n'
    },
    // The eval's blocked class, resolved: a decided-for-you card instead of a dead end.
    expect: {
      resources: { orders: 'web-service' },
      assumesKinds: ['command-unknown'],
      deployable: true
    }
  },
  {
    name: 'render manifest read as the deployment shape it declares',
    files: {
      'render.yaml': [
        'services:',
        '  - type: web',
        '    name: storefront',
        '    env: node',
        '    startCommand: node dist/server.js',
        '    envVars:',
        '      - key: DATABASE_URL',
        '        fromDatabase:',
        '          name: main-db',
        '          property: connectionString',
        'databases:',
        '  - name: main-db',
        ''
      ].join('\n')
    },
    expect: {
      dependencyKinds: ['postgres'],
      resources: { storefront: 'web-service', mainDatabase: 'relational-database' },
      // A Blueprint is an intended deployment shape, not evidence that this database is live. It
      // should import cleanly without asking the user to adjudicate a claim the repository cannot
      // prove; environment/connection evidence remains the path that protects a real database.
      maxQuestions: 0,
      deployable: true
    }
  }
];

describe('deterministic baseline', () => {
  const scores: EvalScore[] = [];

  for (const evalCase of CASES) {
    it(evalCase.name, async () => {
      const score = await runEvalCase(evalCase);
      scores.push(score);

      if (!score.passed) {
        throw new Error(
          `${score.name} failed:\n${score.failures.map((failure) => `  [${failure.stage}] ${failure.detail}`).join('\n')}`
        );
      }
      expect(score.passed).toBe(true);
    });
  }

  it('reports a summary', () => {
    // Printed rather than asserted: the numbers are a trend to watch, not a threshold to game.
    console.log(`\n  ${summarise(scores)}`);
    expect(scores.length).toBeGreaterThan(0);
  });
});
