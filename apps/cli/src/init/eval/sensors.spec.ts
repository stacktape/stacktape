/**
 * Cases where a sensor is *required* to fire.
 *
 * The baseline suite next door asserts that good input passes cleanly, and it reports a near-zero
 * "things assumed, claims dropped". Read on its own that number is ambiguous: it looks exactly
 * the same whether the verifier is discriminating or switched off entirely. A suite that only ever
 * feeds a checker things it should accept cannot tell you the checker works.
 *
 * So these feed it things it must reject. A deliberately dishonest agent, an invented dependency, a
 * misattributed citation, a live database it must not quietly replace. If any of these stops failing
 * verification, a sensor has gone blind and the baseline's clean numbers have stopped meaning
 * anything.
 */

import { describe, expect, it } from 'bun:test';
import { agentSubmissionSchema, type AgentSubmission } from '@stacktape/config-inference/facts/agent-submission';
import { runEvalCase, type EvalCase } from './harness';
import type { AgentRunner } from '../missions/greenfield';

/** An agent that submits exactly what it is told to, however dishonest. */
const agentSubmitting =
  (submission: AgentSubmission): AgentRunner =>
  async () => ({
    submission,
    usage: { inputTokens: 100, outputTokens: 50 },
    stopReason: 'complete'
  });

const EXPRESS_ONLY = {
  'package.json': JSON.stringify({
    name: 'plain',
    scripts: { start: 'node index.js' },
    dependencies: { express: '^5.0.0' }
  }),
  'package-lock.json': '{}',
  'src/index.ts': 'import express from "express";\nconst app = express();\napp.listen(3000);'
};

// Parsed through the schema so the fixture is exactly what a real submission delivers, defaults
// included, rather than a hand-written shape that only resembles one.
const service = agentSubmissionSchema.parse({
  schemaVersion: 1,
  services: [
    {
      name: 'plain',
      path: '.',
      language: 'javascript',
      exposesHttp: true,
      executionModel: 'long-running',
      startCommand: 'node index.js',
      evidence: []
    }
  ]
}).services[0]!;

describe('sensors fire on claims that are not supported', () => {
  it('catches a dependency the repository never mentions', async () => {
    const evalCase: EvalCase = {
      name: 'invented redis',
      files: EXPRESS_ONLY,
      // The claim survives as a recorded assumption rather than as a blocker: nothing stops, and
      // the user can still see it was never confirmed.
      expect: { raisesQuestionKinds: ['unconfirmed-claim'], deployable: true }
    };

    const score = await runEvalCase(
      evalCase,
      agentSubmitting({
        schemaVersion: 1,
        services: [],
        // Nothing in this project uses Redis. Uncited, so nothing supports it.
        dependencies: [{ name: 'cache', kind: 'redis', extensions: [], consumedBy: ['plain'], evidence: [] }],
        migrations: [],
        unknowns: []
      })
    );

    expect(score.failures).toEqual([]);
    expect(score.claimsDropped).toBeGreaterThan(0);
  });

  it('catches a citation that points at real code saying something else', async () => {
    const evalCase: EvalCase = {
      name: 'misattributed citation',
      files: EXPRESS_ONLY,
      // The claim survives as a recorded assumption rather than as a blocker: nothing stops, and
      // the user can still see it was never confirmed.
      expect: { raisesQuestionKinds: ['unconfirmed-claim'], deployable: true }
    };

    const score = await runEvalCase(
      evalCase,
      agentSubmitting({
        schemaVersion: 1,
        services: [],
        dependencies: [
          {
            name: 'docs',
            kind: 'mongodb',
            extensions: [],
            consumedBy: ['plain'],
            // A real line in a real file — that says nothing whatsoever about MongoDB. This is the
            // case a quote-existence check waves straight through, and the anchors are what stop it.
            evidence: [{ file: 'src/index.ts', line: 1, quote: 'import express from "express";' }]
          }
        ],
        migrations: [],
        unknowns: []
      })
    );

    expect(score.failures).toEqual([]);
  });

  it('does not let a forged provenance claim skip verification', async () => {
    // `source: 'probe'` marks a fact as constructed by our own code and therefore exempt from
    // downgrade. If a submission could set it, one field would disable the entire verifier.
    const evalCase: EvalCase = {
      name: 'forged probe provenance',
      files: EXPRESS_ONLY,
      // The claim survives as a recorded assumption rather than as a blocker: nothing stops, and
      // the user can still see it was never confirmed.
      expect: { raisesQuestionKinds: ['unconfirmed-claim'], deployable: true }
    };

    const score = await runEvalCase(
      evalCase,
      agentSubmitting({
        schemaVersion: 1,
        services: [],
        dependencies: [
          {
            name: 'cache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['plain'],
            evidence: [],
            source: 'probe'
          } as never
        ],
        migrations: [],
        unknowns: []
      })
    );

    expect(score.failures).toEqual([]);
  });

  it('refuses to replace a database that is already serving traffic', async () => {
    const evalCase: EvalCase = {
      name: 'live neon database',
      files: {
        ...EXPRESS_ONLY,
        '.env':
          'DATABASE_URL=postgres://\${DATABASE_USER}:\${DATABASE_PASSWORD}@ep-cool-frost.eu-central-1.aws.neon.tech/main\n'
      },
      expect: {
        dependencyKinds: ['postgres'],
        // Decided rather than asked: keep using the live one, create nothing, and say so.
        raisesQuestionKinds: ['external-database-disposition'],
        deployable: true
      }
    };

    const score = await runEvalCase(evalCase);

    expect(score.failures).toEqual([]);
  });
});

describe('sensors stay quiet when they should', () => {
  it('accepts a well-cited claim without questioning it', async () => {
    // The other half of the contract. A verifier that flags everything is as useless as one that
    // flags nothing, and far more annoying.
    const evalCase: EvalCase = {
      name: 'honest submission',
      files: {
        ...EXPRESS_ONLY,
        'package.json': JSON.stringify({
          name: 'plain',
          scripts: { start: 'node index.js' },
          dependencies: { express: '^5.0.0', ioredis: '^5.4.0' }
        })
      },
      expect: { dependencyKinds: ['redis'], deployable: true, maxQuestions: 0 }
    };

    const score = await runEvalCase(
      evalCase,
      agentSubmitting({
        schemaVersion: 1,
        services: [service],
        dependencies: [
          {
            name: 'cache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['plain'],
            evidence: [{ file: 'package.json', line: 1, quote: '"ioredis"' }]
          }
        ],
        migrations: [],
        unknowns: []
      })
    );

    expect(score.failures).toEqual([]);
    expect(score.claimsDropped).toBe(0);
  });
});
