import { describe, expect, test } from 'bun:test';
import type { WizardState } from '../../src/init/server/wizard-server';
import {
  evaluateFixtureComposition,
  healthResourceName,
  INIT_CANARY_FIXTURES,
  resourceTypesIn
} from './init-canary-fixtures';

const stateWith = ({
  resources,
  deployable = true,
  gaps = []
}: {
  resources: Record<string, { type: string; properties?: Record<string, unknown> }>;
  deployable?: boolean;
  gaps?: unknown[];
}): WizardState => ({
  phase: 'reviewing',
  projectName: 'v4canary-init-test',
  timeline: [],
  answers: {},
  composition: { resources, deployable, gaps }
});

describe('init canary fixture contracts', () => {
  test('accepts the expected Express topology and resolves its health target', () => {
    const state = stateWith({ resources: { api: { type: 'web-service' } } });
    const fixture = INIT_CANARY_FIXTURES['express-basic'];

    expect(resourceTypesIn(state)).toEqual({ api: 'web-service' });
    expect(evaluateFixtureComposition({ fixture, state })).toEqual([]);
    expect(healthResourceName({ fixture, state })).toBe('api');
  });

  test('rejects phantom stateful resources and missing required resources', () => {
    const state = stateWith({ resources: { database: { type: 'relational-database' } } });
    const problems = evaluateFixtureComposition({ fixture: INIT_CANARY_FIXTURES['express-basic'], state });

    expect(problems).toContain('Resource type web-service appears 0 times, expected 1-1.');
    expect(problems).toContain('Forbidden resource type relational-database was composed.');
  });

  test('does not accept a non-deployable or gap-bearing result as healthy generation', () => {
    const state = stateWith({
      resources: { api: { type: 'web-service' } },
      deployable: false,
      gaps: [{ kind: 'missing-secret' }]
    });
    const problems = evaluateFixtureComposition({ fixture: INIT_CANARY_FIXTURES['express-basic'], state });

    expect(problems).toContain('Composition deployable is false, expected true.');
    expect(problems).toContain('Composition has 1 gaps, expected at most 0.');
  });

  test('locks the topology and health target for every paid fixture', () => {
    const cases = [
      {
        fixture: INIT_CANARY_FIXTURES['express-basic'],
        resources: { api: { type: 'web-service' } },
        health: 'api'
      },
      {
        fixture: INIT_CANARY_FIXTURES['express-postgres-migration'],
        resources: { api: { type: 'web-service' }, mainDatabase: { type: 'relational-database' } },
        health: 'api'
      },
      {
        fixture: INIT_CANARY_FIXTURES['vite-static'],
        resources: { website: { type: 'hosting-bucket' } },
        health: 'website'
      },
      {
        fixture: INIT_CANARY_FIXTURES['fastapi-basic'],
        resources: { api: { type: 'web-service' } },
        health: 'api'
      }
    ];

    for (const entry of cases) {
      const state = stateWith({ resources: entry.resources });
      expect(evaluateFixtureComposition({ fixture: entry.fixture, state })).toEqual([]);
      expect(healthResourceName({ fixture: entry.fixture, state })).toBe(entry.health);
    }
  });
});
