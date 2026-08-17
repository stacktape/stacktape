import { join } from 'node:path';
import type { WizardState } from '../../src/init/server/wizard-server';

export type InitCanaryFixture = {
  id: string;
  description: string;
  sourceDirectory: string;
  expected: {
    resourceTypes: Record<string, { min: number; max?: number }>;
    forbiddenResourceTypes?: string[];
    deployable: boolean;
    maxGaps: number;
  };
  preflight: 'required' | 'unsupported-resource-type';
  health:
    | {
        kind: 'http';
        resourceType: string;
        path: string;
        expectedStatus: number;
        bodyIncludes: string;
      }
    | { kind: 'none'; reason: string };
};

const fixtureRoot = join(import.meta.dir, '..', '..', '_test-stacks', 'init-canary');

/**
 * The initial high-information slice. Importer syntax breadth belongs in deterministic eval tests;
 * this corpus spends AWS money only where a live data-plane check proves another layer.
 */
export const INIT_CANARY_FIXTURES = {
  'express-basic': {
    id: 'express-basic',
    description: 'Cheapest complete files-only path from an ordinary Node API to a live HTTP response.',
    sourceDirectory: join(fixtureRoot, 'express-basic'),
    expected: {
      resourceTypes: { 'web-service': { min: 1, max: 1 } },
      forbiddenResourceTypes: ['relational-database', 'redis-cluster'],
      deployable: true,
      maxGaps: 0
    },
    // This intentionally exposes the current gap: preferred Stacktape image buildpacks are not
    // exercised by local preflight yet. The canary must not count "skipped" as a pass.
    preflight: 'required',
    health: {
      kind: 'http',
      resourceType: 'web-service',
      path: '/',
      expectedStatus: 200,
      bodyIncludes: 'express-basic'
    }
  },
  'express-postgres-migration': {
    id: 'express-postgres-migration',
    description: 'Proves env wiring, generated secrets, RDS connectivity, and a Procfile release migration.',
    sourceDirectory: join(fixtureRoot, 'express-postgres-migration'),
    expected: {
      resourceTypes: {
        'web-service': { min: 1, max: 1 },
        'relational-database': { min: 1, max: 1 }
      },
      deployable: true,
      maxGaps: 0
    },
    preflight: 'required',
    health: {
      kind: 'http',
      resourceType: 'web-service',
      path: '/',
      expectedStatus: 200,
      bodyIncludes: 'migrated-ok'
    }
  },
  'vite-static': {
    id: 'vite-static',
    description: 'Proves a frontend stays static and serves its built artifact without inventing a server.',
    sourceDirectory: join(fixtureRoot, 'vite-static'),
    expected: {
      resourceTypes: { 'hosting-bucket': { min: 1, max: 1 } },
      forbiddenResourceTypes: ['web-service', 'relational-database'],
      deployable: true,
      maxGaps: 0
    },
    // The current preflight engine deliberately excludes hosting-bucket resources. Deployment can
    // still prove this fixture, but its local result must be reported as unsupported, never passed.
    preflight: 'unsupported-resource-type',
    health: {
      kind: 'http',
      resourceType: 'hosting-bucket',
      path: '/',
      expectedStatus: 200,
      bodyIncludes: 'Stacktape init canary'
    }
  },
  'fastapi-basic': {
    id: 'fastapi-basic',
    description: 'Proves the supported non-JavaScript HTTP lane and Python entrypoint handling.',
    sourceDirectory: join(fixtureRoot, 'fastapi-basic'),
    expected: {
      resourceTypes: { 'web-service': { min: 1, max: 1 } },
      forbiddenResourceTypes: ['relational-database', 'redis-cluster'],
      deployable: true,
      maxGaps: 0
    },
    preflight: 'required',
    health: {
      kind: 'http',
      resourceType: 'web-service',
      path: '/',
      expectedStatus: 200,
      bodyIncludes: 'fastapi-basic'
    }
  }
} as const satisfies Record<string, InitCanaryFixture>;

export type InitCanaryFixtureId = keyof typeof INIT_CANARY_FIXTURES;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const compositionOf = (state: WizardState): Record<string, unknown> | undefined =>
  isRecord(state.composition) ? state.composition : undefined;

export const resourceTypesIn = (state: WizardState): Record<string, string> => {
  const composition = compositionOf(state);
  const resources = composition !== undefined && isRecord(composition.resources) ? composition.resources : undefined;
  if (resources === undefined) return {};
  const result: Record<string, string> = {};
  for (const [name, resource] of Object.entries(resources)) {
    if (isRecord(resource) && typeof resource.type === 'string') result[name] = resource.type;
  }
  return result;
};

export const evaluateFixtureComposition = ({
  fixture,
  state
}: {
  fixture: InitCanaryFixture;
  state: WizardState;
}): string[] => {
  const problems: string[] = [];
  const composition = compositionOf(state);
  if (state.phase !== 'reviewing') problems.push(`Wizard phase is ${state.phase}, expected reviewing.`);
  if (composition === undefined) return [...problems, 'Wizard produced no composition.'];

  const types = Object.values(resourceTypesIn(state));
  for (const [type, range] of Object.entries(fixture.expected.resourceTypes)) {
    const count = types.filter((candidate) => candidate === type).length;
    if (count < range.min || (range.max !== undefined && count > range.max)) {
      problems.push(
        `Resource type ${type} appears ${count} times, expected ${range.min}${range.max === undefined ? '+' : `-${range.max}`}.`
      );
    }
  }
  for (const type of fixture.expected.forbiddenResourceTypes ?? []) {
    if (types.includes(type)) problems.push(`Forbidden resource type ${type} was composed.`);
  }

  if (composition.deployable !== fixture.expected.deployable) {
    problems.push(
      `Composition deployable is ${String(composition.deployable)}, expected ${fixture.expected.deployable}.`
    );
  }
  const gaps = Array.isArray(composition.gaps) ? composition.gaps.length : 0;
  if (gaps > fixture.expected.maxGaps) {
    problems.push(`Composition has ${gaps} gaps, expected at most ${fixture.expected.maxGaps}.`);
  }
  return problems;
};

export const healthResourceName = ({
  fixture,
  state
}: {
  fixture: InitCanaryFixture;
  state: WizardState;
}): string | undefined => {
  const health = fixture.health;
  if (health.kind === 'none') return undefined;
  return Object.entries(resourceTypesIn(state)).find(([, type]) => type === health.resourceType)?.[0];
};
