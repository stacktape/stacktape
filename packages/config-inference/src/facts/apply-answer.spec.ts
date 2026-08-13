import { describe, expect, it } from 'bun:test';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema, type ProjectFacts } from './project-facts';
import type { Uncertainty } from './uncertainty';
import { applyAnswer, recommendationFor } from './apply-answer';

const uncertaintyIn = (facts: ProjectFacts, id: string): Uncertainty =>
  facts.uncertainties.find((entry) => entry.id === id)!;

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

describe('applyAnswer', () => {
  it('removes the question it answers, so composition stops being blocked', () => {
    const facts = factsWith({
      uncertainties: [
        {
          kind: 'service-deployment-intent',
          id: 'service-deployment-intent:api',
          blocksDeploy: true,
          evidence: [],
          source: 'agent',
          serviceName: 'api',
          recommended: 'deploy'
        }
      ]
    });

    const after = applyAnswer({
      facts,
      uncertainty: uncertaintyIn(facts, 'service-deployment-intent:api'),
      value: 'deploy'
    });

    expect(after.uncertainties).toHaveLength(0);
    expect(after.services).toHaveLength(1);
  });

  it('drops a service the user chose not to deploy', () => {
    const facts = factsWith({
      uncertainties: [
        {
          kind: 'service-deployment-intent',
          id: 'service-deployment-intent:api',
          blocksDeploy: false,
          evidence: [],
          source: 'agent',
          serviceName: 'api',
          recommended: 'deploy'
        }
      ]
    });

    expect(
      applyAnswer({ facts, uncertainty: uncertaintyIn(facts, 'service-deployment-intent:api'), value: 'skip' }).services
    ).toHaveLength(0);
  });

  it('creates nothing for a database the user keeps using where it is', () => {
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
      ],
      uncertainties: [
        {
          kind: 'external-database-disposition',
          id: 'external-database:mainDatabase',
          blocksDeploy: true,
          evidence: [],
          source: 'probe',
          dependencyName: 'mainDatabase',
          provider: 'supabase',
          recommended: 'point-at-existing'
        }
      ]
    });

    const kept = applyAnswer({
      facts,
      uncertainty: uncertaintyIn(facts, 'external-database:mainDatabase'),
      value: 'point-at-existing'
    });
    // Removed outright rather than flagged, so no later stage can provision it by accident.
    expect(kept.dependencies).toHaveLength(0);

    const replaced = applyAnswer({
      facts,
      uncertainty: uncertaintyIn(facts, 'external-database:mainDatabase'),
      value: 'create-new'
    });
    expect(replaced.dependencies[0]?.currentlyHostedOn).toBeUndefined();
  });

  it('removes an unconfirmed claim only when the user rejects it', () => {
    const facts = factsWith({
      dependencies: [
        { name: 'cache', kind: 'redis', extensions: [], consumedBy: ['api'], evidence: [], source: 'agent' }
      ],
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

    // The user saying so is the one thing that makes dropping a claim safe.
    expect(
      applyAnswer({ facts, uncertainty: uncertaintyIn(facts, 'unconfirmed:dependency:cache:redis'), value: 'reject' })
        .dependencies
    ).toHaveLength(0);
    expect(
      applyAnswer({ facts, uncertainty: uncertaintyIn(facts, 'unconfirmed:dependency:cache:redis'), value: 'accept' })
        .dependencies
    ).toHaveLength(1);
  });

  it('records a typed command answer on the service', () => {
    const facts = factsWith({
      services: [{ ...service, startCommand: undefined }],
      uncertainties: [
        {
          kind: 'command-unknown',
          id: 'command-unknown:api',
          blocksDeploy: true,
          evidence: [],
          source: 'agent',
          serviceName: 'api',
          command: 'start',
          suggestions: []
        }
      ]
    });

    const after = applyAnswer({ facts, uncertainty: uncertaintyIn(facts, 'command-unknown:api'), value: 'pnpm start' });

    expect(after.services[0]?.startCommand).toBe('pnpm start');
  });

  it('resolves a question that amends no fact', () => {
    // Stage intent is recorded and consumed by a later stage; it changes nothing about the project.
    const facts = factsWith({
      uncertainties: [
        {
          kind: 'stage-intent',
          id: 'stage-intent',
          blocksDeploy: true,
          evidence: [],
          source: 'probe',
          recommended: 'trial'
        }
      ]
    });

    const after = applyAnswer({ facts, uncertainty: uncertaintyIn(facts, 'stage-intent'), value: 'trial' });

    expect(after.uncertainties).toHaveLength(0);
    expect(after.services).toEqual(facts.services);
  });
});

describe('recommendationFor', () => {
  it('has an answer for every kind, so nothing has to interrupt anyone', () => {
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
          suggestions: []
        }
      ]
    });

    // No suggestion and no `recommended` field: the fallback is the convention, not silence.
    expect(recommendationFor(uncertaintyIn(facts, 'command-unknown:api'))).toBe('npm start');
  });

  it('declines to guess which of several services a variable points at', () => {
    const facts = factsWith({
      uncertainties: [
        {
          kind: 'cross-service-target-unknown',
          id: 'cross-service:api:API_URL',
          blocksDeploy: false,
          evidence: [],
          source: 'agent',
          serviceName: 'api',
          environmentVariableName: 'API_URL',
          candidateServiceNames: ['web', 'admin']
        }
      ]
    });

    // Picking one of two would be a coin toss with the user's traffic.
    expect(recommendationFor(uncertaintyIn(facts, 'cross-service:api:API_URL'))).toBeUndefined();
  });
});
