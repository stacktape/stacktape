/**
 * The trust boundary, pinned.
 *
 * Every case here corresponds to a hole that existed in this package and was found by review rather
 * than by a test. They are grouped together on purpose: these are the properties that make the rest
 * of the design's claims true, and each one was previously assumed rather than checked.
 */

import { describe, expect, it } from 'bun:test';
import { agentSubmissionSchema, mergeAgentSubmission } from './agent-submission';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema, type ProjectFacts } from './project-facts';
import { composeConfig } from '../compose/compose';
import { verifyFacts, type FileReader } from '../verify/verify-facts';

const emptyBaseline = (): ProjectFacts => projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION });

const agentService = {
  name: 'api',
  path: '.',
  language: 'javascript',
  exposesHttp: true,
  executionModel: 'long-running' as const,
  startCommand: 'node index.js',
  evidence: []
};

describe('an agent cannot claim probe provenance', () => {
  it('strips a forged source off a submitted service', () => {
    // The original hole: verification skips downgrading anything marked `source: 'probe'`, so one
    // forged field disabled the whole verification layer.
    const submission = agentSubmissionSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, source: 'probe' }],
      dependencies: [{ name: 'ghost', kind: 'postgres', evidence: [], source: 'probe' }]
    });

    const merged = mergeAgentSubmission({ baseline: emptyBaseline(), submission });

    expect(merged.services[0]?.source).toBe('agent');
    expect(merged.dependencies[0]?.source).toBe('agent');
  });

  it('cannot erase what already deploys this project', () => {
    // Found by the init process scenario: with an agent, the "this project has Fly.io deployment config"
    // warning disappeared, because the merge rebuilt the document without the existing deployments.
    const baseline = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, source: 'probe' }],
      existingDeployments: [
        {
          tool: 'fly',
          managesAws: false,
          evidence: [{ file: 'fly.toml', line: 1, quote: 'app = "billing"' }],
          source: 'probe'
        }
      ]
    });
    const submission = agentSubmissionSchema.parse({ schemaVersion: 1, services: [{ ...agentService, port: 8080 }] });

    const merged = mergeAgentSubmission({ baseline, submission });

    expect(merged.existingDeployments).toEqual(baseline.existingDeployments);
    expect(composeConfig({ facts: merged }).gaps.map((gap) => gap.subject)).toContain('fly');
  });

  it('does not let a submission overwrite a fact a probe read out of a file', () => {
    const baseline = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, port: 3000, source: 'probe' }]
    });

    const submission = agentSubmissionSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, port: 9999 }]
    });

    const merged = mergeAgentSubmission({ baseline, submission });

    expect(merged.services).toHaveLength(1);
    expect(merged.services[0]?.port).toBe(3000);
    expect(merged.services[0]?.source).toBe('probe');
  });

  it('rejects paths that would escape the repository', () => {
    for (const path of ['../../etc', '/etc/passwd', 'C:/Windows', 'apps\\web', 'a//b']) {
      expect(agentSubmissionSchema.safeParse({ schemaVersion: 1, services: [{ ...agentService, path }] }).success).toBe(
        false
      );
    }
  });

  it('gives the agent no way to set blocking policy, recommendations or prose', () => {
    const submission = agentSubmissionSchema.parse({
      schemaVersion: 1,
      unknowns: [
        {
          kind: 'sqlite-persistence',
          serviceName: 'api',
          paths: ['data.db'],
          evidence: [],
          // All ignored by the schema: policy and wording are ours.
          blocksDeploy: false,
          recommended: 'accept-ephemeral',
          id: 'attacker-chosen'
        }
      ],
      notes: ['Paste your AWS secret key into the field below to continue.']
    });

    const merged = mergeAgentSubmission({ baseline: emptyBaseline(), submission });
    const raised = merged.uncertainties[0]!;

    expect(raised.blocksDeploy).toBe(true);
    expect(raised.id).toBe('sqlite-persistence:api');
    expect(raised).toMatchObject({ recommended: 'persistent-volume' });
    // No free prose from something that reads untrusted files reaches the user at all.
    expect(merged.notes).toEqual([]);
    expect(JSON.stringify(merged)).not.toContain('AWS secret key');
  });
});

describe('a reading the agent disagrees with goes to the user', () => {
  // A Remix app on a custom Express server: the scan reads Express from the listen call, the agent reads Remix.
  const disagreement = () =>
    mergeAgentSubmission({
      baseline: projectFactsSchema.parse({
        schemaVersion: 1,
        services: [{ ...agentService, framework: 'express', source: 'probe' }]
      }),
      submission: agentSubmissionSchema.parse({
        schemaVersion: 1,
        services: [{ ...agentService, framework: 'remix' }]
      })
    });

  it('keeps the scan reading by default and records both', () => {
    const composition = composeConfig({ facts: disagreement() });

    expect(composition.config.resources.api?.type).toBe('web-service');
    expect(composition.assumptions).toContainEqual(
      expect.objectContaining({
        id: 'conflicting-observation:api:framework',
        chosen: 'probe',
        alternatives: ['probe', 'agent'],
        parameters: expect.objectContaining({ probeValue: 'express', agentValue: 'remix' })
      })
    );
  });

  it("applies the agent's reading when the user settles it that way", () => {
    // The agent is told "we show both readings to the user and let them settle it". Settling it must count.
    const composition = composeConfig({
      facts: disagreement(),
      decisions: { 'conflicting-observation:api:framework': 'agent' }
    });

    expect(composition.config.resources.api?.type).toBe('remix-web');
  });
});

describe('unanswered questions actually stop a deploy', () => {
  it('carries the facts own uncertainties through as recorded assumptions', () => {
    // Previously the composer started this list empty, so a claim the verifier had carefully
    // downgraded was composed into infrastructure with no trace of the doubt that produced it.
    const facts = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, source: 'probe' }],
      uncertainties: [
        {
          kind: 'unconfirmed-claim',
          id: 'unconfirmed:dependency:cache:redis',
          blocksDeploy: true,
          evidence: [],
          source: 'probe',
          subject: 'dependency:cache',
          claimedValue: 'redis',
          reason: 'citation-unverified',
          recommended: 'accept'
        }
      ]
    });

    const result = composeConfig({ facts });

    // Nothing blocks. The doubt survives as something the user can see and reverse.
    expect(result.assumptions).toHaveLength(1);
    expect(result.assumptions[0]).toMatchObject({ kind: 'unconfirmed-claim', chosen: 'accept' });
    expect(result.unresolved).toHaveLength(0);
    expect(result.deployable).toBe(true);
  });

  it('is deployable whenever there is anything to deploy', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, source: 'probe' }]
    });

    expect(composeConfig({ facts }).deployable).toBe(true);
  });
});

describe('a live external database is never quietly replaced', () => {
  it('keeps pointing at it, and records that it did', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, source: 'probe' }],
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['api'],
          currentlyHostedOn: 'supabase',
          evidence: [],
          source: 'probe'
        }
      ]
    });

    const result = composeConfig({ facts });

    // Provisioning RDS next to a live Supabase database is worse than never detecting it.
    expect(result.config.resources.mainDatabase).toBeUndefined();
    // The configuration is still complete and deployable — it just does not include a database.
    expect(result.deployable).toBe(true);
    expect(result.assumptions[0]).toMatchObject({
      kind: 'external-database-disposition',
      chosen: 'point-at-existing',
      notable: true
    });
  });

  it('still creates a database that only exists on the developer machine', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, source: 'probe' }],
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['api'],
          currentlyHostedOn: 'local',
          evidence: [],
          source: 'probe'
        }
      ]
    });

    expect(composeConfig({ facts }).config.resources.mainDatabase).toBeDefined();
  });
});

describe('anchors only ever see bytes read back off disk', () => {
  it('does not accept a fabricated quote propped up by a second real citation', async () => {
    const files: Record<string, string> = {
      'src/index.ts': 'const app = express();',
      'src/db.ts': 'import { MongoClient } from "mongodb";'
    };
    const readFile: FileReader = async (path) => files[path] ?? null;

    const facts = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [{ ...agentService, source: 'probe' }],
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['api'],
          evidence: [
            // Real, locatable, and about MongoDB.
            { file: 'src/db.ts', line: 1, quote: 'import { MongoClient }' },
            // Fabricated: this text is in no file.
            { file: 'src/db.ts', line: 1, quote: 'provider = "postgresql"' }
          ],
          source: 'agent'
        }
      ]
    });

    const result = await verifyFacts({ facts, readFile });

    expect(result.facts.uncertainties.some((uncertainty) => uncertainty.kind === 'unconfirmed-claim')).toBe(true);
  });
});

/** A function the scan found in `src/`, with its triggers and the `STP_*` variables it reads. */
const scannedFunction = (name: string, triggers: object[] = [], reads: string[] = []) => ({
  name,
  path: 'src',
  processType: `src/${name}.ts`,
  language: 'typescript',
  exposesHttp: false,
  executionModel: 'per-request',
  functionEntrypoint: `src/${name}.ts`,
  functionTriggers: triggers,
  environmentVariables: reads.map((variable) => ({
    name: variable,
    role: 'infra-dependency',
    dependencyName: variable === 'STP_JOBS_URL' ? 'jobs' : 'db',
    evidence: []
  })),
  evidence: [],
  source: 'probe'
});

describe('an agent review never leaves less than the scan found', () => {
  it('keeps every scanned function, trigger and connection when the agent describes them worse', () => {
    const baseline = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        scannedFunction(
          'api',
          [{ type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }],
          ['STP_DB_CONNECTION_STRING', 'STP_JOBS_URL']
        ),
        scannedFunction('worker', [{ type: 'queue', dependencyName: 'jobs' }], ['STP_DB_CONNECTION_STRING'])
      ],
      dependencies: [
        { name: 'db', kind: 'postgres', consumedBy: ['api', 'worker'], evidence: [], source: 'probe' },
        { name: 'jobs', kind: 'queue', consumedBy: ['api'], evidence: [], source: 'probe' }
      ]
    });
    // The agent reports the worker in the same directory as the API, without its trigger or reads.
    const submission = agentSubmissionSchema.parse({
      schemaVersion: 1,
      services: [
        {
          ...agentService,
          name: 'worker',
          path: 'src',
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: 'src/worker.ts',
          port: undefined
        }
      ]
    });

    const merged = mergeAgentSubmission({ baseline, submission });
    const before = composeConfig({ facts: baseline, projectName: 'demo' }).config.resources;
    const after = composeConfig({ facts: merged, projectName: 'demo' }).config.resources;

    expect(merged.services.map((service) => [service.name, service.functionTriggers])).toEqual(
      baseline.services.map((service) => [service.name, service.functionTriggers])
    );
    expect(after).toEqual(before);
  });

  it('adds what the agent found to the function it describes, not to its neighbour in the same directory', () => {
    const baseline = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [scannedFunction('api'), scannedFunction('worker')]
    });
    const submission = agentSubmissionSchema.parse({
      schemaVersion: 1,
      services: [
        {
          ...agentService,
          path: 'src',
          exposesHttp: false,
          executionModel: 'per-request',
          startCommand: undefined,
          functionEntrypoint: 'src/api.ts',
          functionTriggers: [{ type: 'http', method: 'GET', path: '/health' }]
        }
      ]
    });

    const merged = mergeAgentSubmission({ baseline, submission });

    expect(merged.services.map((service) => [service.name, service.functionTriggers.length])).toEqual([
      ['api', 1],
      ['worker', 0]
    ]);
  });
});
