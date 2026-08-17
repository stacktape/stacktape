import { describe, expect, it } from 'bun:test';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema, type ProjectFacts } from '../facts/project-facts';
import { composeConfig } from './compose';
import { resolveAssumptions } from './assumptions';

const service = {
  name: 'api',
  path: '.',
  language: 'javascript',
  exposesHttp: true,
  executionModel: 'long-running' as const,
  startCommand: 'node index.js',
  evidence: [],
  source: 'probe' as const
};

const factsWith = (overrides: Record<string, unknown>): ProjectFacts =>
  projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION, services: [service], ...overrides });

describe('nothing is left for the user to answer', () => {
  it('decides every open question and records what it decided', () => {
    const facts = factsWith({
      uncertainties: [
        {
          kind: 'command-unknown',
          id: 'command-unknown:api',
          blocksDeploy: true,
          evidence: [],
          source: 'agent',
          serviceName: 'api',
          command: 'start',
          suggestions: ['node server.js']
        },
        {
          kind: 'environment-variable-timing',
          id: 'timing:api:NEXT_PUBLIC_URL',
          blocksDeploy: false,
          evidence: [],
          source: 'agent',
          serviceName: 'api',
          environmentVariableName: 'NEXT_PUBLIC_URL',
          recommended: 'build-time'
        }
      ]
    });

    const resolved = resolveAssumptions(facts);

    // The whole point: the questions are gone and the answers are on the record.
    expect(resolved.facts.uncertainties).toHaveLength(0);
    expect(resolved.assumptions.map((entry) => [entry.kind, entry.chosen])).toEqual([
      ['command-unknown', 'node server.js'],
      ['environment-variable-timing', 'build-time']
    ]);
  });

  it('produces a deployable configuration even when everything was uncertain', () => {
    const result = composeConfig({
      facts: factsWith({
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
      })
    });

    expect(result.deployable).toBe(true);
    expect(result.unresolved).toHaveLength(0);
  });

  it('marks the decisions that are discovered late, and leaves the rest quiet', () => {
    const result = composeConfig({
      facts: factsWith({
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
        ],
        uncertainties: [
          {
            kind: 'schedule-unknown',
            id: 'schedule:api',
            blocksDeploy: false,
            evidence: [],
            source: 'agent',
            serviceName: 'api',
            suggestions: []
          }
        ]
      })
    });

    const byKind = Object.fromEntries(result.assumptions.map((entry) => [entry.kind, entry.notable]));
    // "We kept your live database" is worth a glance; "we guessed daily" is not.
    expect(byKind['external-database-disposition']).toBe(true);
    expect(byKind['schedule-unknown']).toBe(false);
  });

  it('honours a changed decision without touching the facts', () => {
    const facts = factsWith({
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

    const kept = composeConfig({ facts });
    const created = composeConfig({ facts, decisions: { 'external-database:mainDatabase': 'create-new' } });
    const revertedAgain = composeConfig({ facts });

    expect(kept.config.resources.mainDatabase).toBeUndefined();
    expect(created.config.resources.mainDatabase).toMatchObject({ type: 'relational-database' });
    // The same facts and no decision produce the original answer again, which is what makes changing
    // one's mind free: nothing was mutated on the way through.
    expect(revertedAgain.config.resources.mainDatabase).toBeUndefined();
  });

  it('still gives the app the address of a database it decided not to create', () => {
    const facts = factsWith({
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['api'],
          addressedBy: ['DATABASE_URL'],
          currentlyHostedOn: 'supabase',
          evidence: [],
          source: 'probe'
        }
      ]
    });

    const kept = composeConfig({ facts });
    const properties = kept.config.resources.api?.properties as {
      environment?: Array<{ name: string; value: unknown }>;
    };

    // Leaving the live database alone means nothing creates it, so `connectTo` has nothing to name.
    // Without this the container deploys, starts with no DATABASE_URL, and crashes looking like ours.
    expect(properties.environment).toEqual([{ name: 'DATABASE_URL', value: "$Secret('database_url')" }]);
    expect(kept.gaps.map((gap) => gap.subject)).toEqual(['api.DATABASE_URL']);

    // Creating our own puts it back on `connectTo`, and the secret reference goes away with it.
    const created = composeConfig({ facts, decisions: { 'external-database:mainDatabase': 'create-new' } });
    const createdProperties = created.config.resources.api?.properties as {
      environment?: unknown;
      connectTo?: string[];
    };
    expect(createdProperties.environment).toBeUndefined();
    expect(createdProperties.connectTo).toEqual(['mainDatabase']);
  });

  it('does not offer an existing event resource until it can preserve the external trigger identity', () => {
    const eventFacts = factsWith({
      services: [
        {
          ...service,
          exposesHttp: false,
          executionModel: 'per-request',
          startCommand: undefined,
          functionEntrypoint: 'src/worker.ts',
          functionTriggers: [{ type: 'queue', dependencyName: 'jobQueue' }]
        }
      ],
      dependencies: [
        {
          name: 'jobQueue',
          kind: 'queue',
          extensions: [],
          consumedBy: ['api'],
          currentlyHostedOn: 'aws',
          hostingEvidence: 'deployment-manifest',
          evidence: [],
          source: 'probe'
        }
      ]
    });

    const composed = composeConfig({
      facts: eventFacts,
      // A stale or hand-written client answer must not make the queue event disappear.
      decisions: { 'external-database:jobQueue': 'point-at-existing' }
    });

    expect(composed.assumptions[0]).toMatchObject({ chosen: 'create-new', alternatives: ['create-new'] });
    expect(composed.config.resources.jobQueue?.type).toBe('sqs-queue');
    expect(composed.config.resources.api?.properties.events).toEqual([
      { type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }
    ]);
  });
});
