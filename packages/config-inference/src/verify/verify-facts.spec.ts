import { describe, expect, it } from 'bun:test';
import {
  PROJECT_FACTS_SCHEMA_VERSION,
  projectFactsSchema,
  type ProjectFacts,
  type ProjectFactsInput
} from '../facts/project-facts';
import { matchQuote, normalizeForMatch } from './quote-match';
import { checkCommandAnchor, checkDependencyAnchor, checkPortAnchor } from './anchors';
import { verifyFacts, type FileReader } from './verify-facts';

const FILES: Record<string, string> = {
  'src/db.ts': ['import { PrismaClient } from "@prisma/client";', '', 'export const db = new PrismaClient();'].join(
    '\n'
  ),
  // Where a Prisma project actually states its engine. The client import alone says nothing: Prisma
  // drives Postgres, MySQL, SQLite and Mongo, so citing it for a Postgres claim is a real
  // misattribution and the anchors are right to reject it.
  'prisma/schema.prisma': ['datasource db {', '  provider = "postgresql"', '  url = env("DATABASE_URL")', '}'].join(
    '\n'
  ),
  'src/index.ts': ['import express from "express";', 'const app = express();', 'app.listen(4000);'].join('\n'),
  'package.json': '{ "scripts": { "build": "tsc -p .", "start": "node dist/index.js" } }',
  '.env.example': 'DATABASE_URL=\nREDIS_URL='
};

const readFile: FileReader = async (path) => FILES[path] ?? null;

const baseService = {
  name: 'web',
  path: '.',
  language: 'typescript',
  exposesHttp: true,
  port: 4000,
  executionModel: 'long-running' as const,
  startCommand: 'node dist/index.js',
  environmentVariables: [],
  evidence: [
    { file: 'src/index.ts', line: 3, quote: 'app.listen(4000)' },
    // Tagged, because the command lives in the manifest rather than wherever the server binds. The
    // untagged citation above supports the service generally; a high-stakes field wants its own.
    {
      field: 'startCommand',
      file: 'package.json',
      line: 1,
      quote: '"start": "node dist/index.js"'
    }
  ],
  source: 'probe' as const
};

const build = (overrides: Partial<ProjectFactsInput> = {}): ProjectFacts =>
  projectFactsSchema.parse({
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    services: [baseService],
    ...overrides
  });

describe('matchQuote', () => {
  const lines = ['const a = 1;', '   const b = 2;   ', 'const c = 3;'];

  it('matches on the cited line ignoring indentation', () => {
    expect(matchQuote(lines, 2, 'const b = 2;')).toEqual({
      outcome: 'exact',
      line: 2
    });
  });

  it('matches a line or two away and reports the distance', () => {
    // Models miscount lines constantly, especially across paged reads. This must not be a failure.
    expect(matchQuote(lines, 1, 'const c = 3;')).toEqual({
      outcome: 'nearby',
      line: 3,
      distance: 2
    });
  });

  it('reports a match far from the citation as misplaced rather than absent', () => {
    const long = [...Array.from({ length: 60 }, () => 'filler'), 'const needle = true;'];

    expect(matchQuote(long, 1, 'const needle = true;')).toEqual({
      outcome: 'elsewhere',
      line: 61
    });
  });

  it('reports genuinely absent text', () => {
    expect(matchQuote(lines, 1, 'const nope = 9;')).toEqual({
      outcome: 'absent'
    });
  });

  it('normalizes whitespace but preserves case', () => {
    expect(normalizeForMatch('  a   b  ')).toBe('a b');
    expect(matchQuote(['const DATABASE_URL = 1;'], 1, 'const database_url = 1;')).toEqual({ outcome: 'absent' });
  });
});

describe('anchors', () => {
  it('accepts Postgres evidence that names a Postgres driver', () => {
    expect(checkDependencyAnchor('postgres', 'import { PrismaClient }\nDATABASE_URL=postgres://').satisfied).toBe(true);
  });

  it('rejects a MongoDB claim evidenced by a Prisma Postgres import', () => {
    // The exact misattribution a quote-only check waves through.
    expect(checkDependencyAnchor('mongodb', 'import { PrismaClient } from "@prisma/client";').satisfied).toBe(false);
  });

  it('treats a Redis-backed queue library as evidence of Redis', () => {
    expect(checkDependencyAnchor('redis', 'import { Queue } from "bullmq";').satisfied).toBe(true);
  });

  it('requires a claimed port to appear literally', () => {
    expect(checkPortAnchor(4000, 'app.listen(4000)').satisfied).toBe(true);
    expect(checkPortAnchor(8080, 'app.listen(4000)').satisfied).toBe(false);
  });

  it('accepts a runner invocation whose script is what the manifest declares', () => {
    expect(checkCommandAnchor('npm run build', '{ "scripts": { "build": "tsc -p ." } }').satisfied).toBe(true);
  });

  it('rejects a command that appears nowhere in the file', () => {
    expect(checkCommandAnchor('python manage.py runserver', '{ "scripts": { "build": "tsc" } }').satisfied).toBe(false);
  });
});

describe('verifyFacts', () => {
  it('verifies a well-cited document and raises nothing', async () => {
    const result = await verifyFacts({
      facts: build({
        dependencies: [
          {
            name: 'mainDatabase',
            kind: 'postgres',
            extensions: [],
            consumedBy: ['web'],
            evidence: [
              {
                file: 'prisma/schema.prisma',
                line: 2,
                quote: 'provider = "postgresql"'
              }
            ],
            source: 'agent'
          }
        ]
      }),
      readFile
    });

    expect(result.facts.uncertainties).toHaveLength(0);
    expect(result.agentFeedback).toEqual([]);
    expect(result.findings.some((f) => f.subject === 'dependency:mainDatabase' && f.outcome === 'verified')).toBe(true);
  });

  it('downgrades an uncited agent claim to a question instead of deleting it', async () => {
    const result = await verifyFacts({
      facts: build({
        dependencies: [
          {
            name: 'cache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['web'],
            evidence: [],
            source: 'agent'
          }
        ]
      }),
      readFile
    });

    // The dependency survives — deleting it would produce a config that deploys and an app that crashes.
    expect(result.facts.dependencies).toHaveLength(1);
    expect(result.facts.uncertainties).toHaveLength(1);
    expect(result.facts.uncertainties[0]).toMatchObject({
      kind: 'unconfirmed-claim',
      subject: 'dependency:cache',
      claimedValue: 'redis',
      blocksDeploy: true,
      recommended: 'accept'
    });
  });

  it('downgrades a claim whose citation points at unrelated code', async () => {
    const result = await verifyFacts({
      facts: build({
        dependencies: [
          {
            name: 'docs',
            kind: 'mongodb',
            extensions: [],
            consumedBy: ['web'],
            evidence: [{ file: 'src/db.ts', line: 1, quote: 'import { PrismaClient }' }],
            source: 'agent'
          }
        ]
      }),
      readFile
    });

    expect(result.facts.uncertainties[0]).toMatchObject({
      reason: 'contradicted-by-probe',
      claimedValue: 'mongodb'
    });
    expect(result.agentFeedback.join(' ')).toContain('dependency:docs');
  });

  it('does not question an agent claim a probe independently reached', async () => {
    const result = await verifyFacts({
      facts: build({
        dependencies: [
          {
            name: 'probeCache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['web'],
            evidence: [],
            source: 'probe'
          },
          {
            name: 'agentCache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['web'],
            evidence: [],
            source: 'agent'
          }
        ]
      }),
      readFile
    });

    // Two independent derivations agreeing beats one quote; asking the user here would be noise.
    expect(result.facts.uncertainties).toHaveLength(0);
    expect(result.findings.some((f) => f.subject === 'dependency:agentCache' && f.outcome === 'corroborated')).toBe(
      true
    );
  });

  it('never downgrades a probe claim, since a probe failure is our bug not the user problem', async () => {
    const result = await verifyFacts({
      facts: build({
        dependencies: [
          {
            name: 'cache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['web'],
            evidence: [],
            source: 'probe'
          }
        ]
      }),
      readFile
    });

    expect(result.facts.uncertainties).toHaveLength(0);
    expect(result.findings.some((f) => f.outcome === 'no-evidence')).toBe(true);
  });

  it('flags a port that does not appear in its evidence', async () => {
    const result = await verifyFacts({
      facts: build({ services: [{ ...baseService, port: 8080 }] }),
      readFile
    });

    expect(result.findings.some((f) => f.field === 'port' && f.outcome === 'anchor-failed')).toBe(true);
  });

  it('flags a start command that appears in no cited file', async () => {
    const result = await verifyFacts({
      facts: build({
        services: [{ ...baseService, startCommand: 'python manage.py runserver' }]
      }),
      readFile
    });

    expect(result.findings.some((f) => f.field === 'startCommand' && f.outcome === 'anchor-failed')).toBe(true);
  });

  it('accepts the production Streamlit command derived from a declared app', async () => {
    const result = await verifyFacts({
      facts: build({
        services: [
          {
            ...baseService,
            language: 'python',
            framework: 'streamlit',
            startCommand: 'streamlit run app.py --server.address 0.0.0.0 --server.port 80',
            evidence: [{ file: 'app.py', line: 1, quote: 'import streamlit as st' }]
          }
        ]
      }),
      readFile: async (path) => (path === 'app.py' ? 'import streamlit as st\nst.title("Demo")\n' : null)
    });

    expect(result.findings.some((f) => f.field === 'startCommand' && f.outcome === 'anchor-failed')).toBe(false);
  });
});
