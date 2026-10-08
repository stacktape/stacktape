import {
  REAL_PROJECT_APPLICATION_STRESS_CASES,
  REAL_PROJECT_CORPUS,
  REAL_PROJECT_PLATFORM_STRESS_CASES,
  type RealProjectCorpusCase
} from '../init-real-project-corpus-cases';
import type { QualificationCaseManifest } from './contracts';

export const SMOKE_CASE_IDS = [
  'serverless-node-dynamodb-rest',
  'heroku-node-getting-started',
  'docker-fastapi',
  'railway-go-mux',
  // A real Node application with a worker and Redis that packages end to end; the Next.js SaaS starters cannot
  // (their builds push a schema or validate the runtime environment), so they stay in the release set as import-only.
  'railway-fastify-bullmq'
] as const;

export type AwsQualificationScenario = {
  id: string;
  runner: 'packaging' | 'init' | 'alias-publication' | 'dev-mode';
  fixture?: 'express-basic' | 'express-postgres-migration' | 'vite-static' | 'fastapi-basic';
  policy: 'routine' | 'periodic' | 'deep';
  costClass: 'negligible' | 'low' | 'medium' | 'high';
  coverage: readonly string[];
  reason: string;
};

export const AWS_QUALIFICATION_SCENARIOS: readonly AwsQualificationScenario[] = [
  {
    id: 'lambda-packaging-update',
    runner: 'packaging',
    policy: 'routine',
    costClass: 'negligible',
    coverage: ['lambda', 'function-url', 'shared-layer', 'no-op-update', 'environment-update', 'cleanup'],
    reason:
      'The existing packaging canary proves artifact identity, live invocation, no-op redeploy, update, and cleanup.'
  },
  {
    id: 'lambda-alias-configuration-update',
    runner: 'alias-publication',
    policy: 'routine',
    costClass: 'negligible',
    coverage: ['lambda', 'codedeploy-alias', 'version-publication', 'environment-update', 'no-op-update', 'cleanup'],
    reason:
      'A configuration-only change must publish a version the alias serves, and an unchanged redeploy must publish none.'
  },
  {
    id: 'dev-mode-local-loop',
    runner: 'dev-mode',
    policy: 'routine',
    costClass: 'negligible',
    coverage: [
      'dev',
      'dev-stack',
      'local-container',
      'local-postgres',
      'local-redis',
      'dev-server',
      'agent-mode',
      'pty',
      'cleanup'
    ],
    reason:
      'dev starts, rebuilds and stops a container, a local database and a dev server against a real dev stack, leaving nothing running.'
  },
  {
    id: 'init-static-site',
    runner: 'init',
    fixture: 'vite-static',
    policy: 'routine',
    costClass: 'low',
    coverage: ['init', 'vite', 'hosting-bucket', 'cloudfront', 'https-health', 'cleanup'],
    reason: 'A static site is inexpensive and exercises the complete init-to-CDN path.'
  },
  {
    id: 'init-node-container',
    runner: 'init',
    fixture: 'express-basic',
    policy: 'periodic',
    costClass: 'medium',
    coverage: ['init', 'node', 'container', 'web-service', 'load-balancer', 'https-health', 'cleanup'],
    reason: 'This proves the common container web-service path without provisioning a database.'
  },
  {
    id: 'init-python-container',
    runner: 'init',
    fixture: 'fastapi-basic',
    policy: 'periodic',
    costClass: 'medium',
    coverage: ['init', 'python', 'container', 'web-service', 'load-balancer', 'https-health', 'cleanup'],
    reason: 'This catches non-Node buildpack and container-runtime regressions.'
  },
  {
    id: 'init-postgres-migration',
    runner: 'init',
    fixture: 'express-postgres-migration',
    policy: 'deep',
    costClass: 'high',
    coverage: ['init', 'container', 'postgres', 'secret', 'vpc', 'migration', 'https-health', 'cleanup'],
    reason:
      'The slowest lane is reserved for release candidates because relational infrastructure dominates time and cost.'
  }
];

const stressCases = [...REAL_PROJECT_PLATFORM_STRESS_CASES, ...REAL_PROJECT_APPLICATION_STRESS_CASES];
const importOnlyCaseIds = new Set([
  // This pinned Vercel starter still exercises importer evidence, but Next 14 is outside the
  // supported @opennextjs/aws 3.10 packaging range.
  'vercel-next-postgres-auth',
  // Nine Aspire services share Directory.Packages.props and project references at the solution root, which the
  // buildpack's single-project .NET build cannot see (documented; a Dockerfile is the supported path). The import
  // lane still proves the nine-service detection.
  'dotnet-eshop',
  // Both validate their environment inside `next build` (Umami's next.config, Formbricks' t3-env schema), so the
  // build needs the real DATABASE_URL and friends before the stack that provides them exists.
  'real-umami',
  'real-formbricks',
  // Its Containerfile's base image pins Debian 11 packages the security archive no longer serves, and its
  // .tool-versions lists conda tools mise cannot install; the web, worker and release detection is the value.
  'real-forem',
  // Its build script is `prisma generate && prisma db push && next build`: the build pushes the schema to a live
  // database, which packaging cannot provide.
  'real-boxyhq-saas-starter'
]);

const fromBuiltInCase = (entry: RealProjectCorpusCase): QualificationCaseManifest => ({
  id: entry.id,
  title: entry.id,
  why: `Pinned ${entry.source} covering ${entry.exercises.join(', ')}.`,
  source: {
    kind: 'git',
    repository: entry.repository,
    commit: entry.commit,
    ...(entry.subdirectory === undefined ? {} : { subdirectory: entry.subdirectory }),
    // Built-in cases are cloned only for qualification and are never redistributed. New external
    // manifests must provide their project's actual license explicitly.
    license: 'upstream-project-license'
  },
  origin: entry.source,
  tags: [...entry.exercises],
  lanes: importOnlyCaseIds.has(entry.id) ? ['import'] : ['import', 'package'],
  expect: {
    resourceTypes: { ...entry.expect.resourceTypes },
    ...(entry.expect.dependencyKinds === undefined ? {} : { dependencyKinds: { ...entry.expect.dependencyKinds } }),
    serviceCount: entry.expect.serviceCount,
    httpServiceCount: entry.expect.httpServiceCount,
    ...(entry.expect.existingDeployments === undefined
      ? {}
      : { existingDeployments: [...entry.expect.existingDeployments] }),
    ...(entry.expect.requiredConfig === undefined ? {} : { requiredConfig: [...entry.expect.requiredConfig] }),
    ...(entry.expect.forbiddenConfig === undefined ? {} : { forbiddenConfig: [...entry.expect.forbiddenConfig] }),
    ...(entry.expect.requiredGapPatterns === undefined
      ? {}
      : { requiredGapPatterns: [...entry.expect.requiredGapPatterns] }),
    ...(entry.expect.forbiddenGapPatterns === undefined
      ? {}
      : { forbiddenGapPatterns: [...entry.expect.forbiddenGapPatterns] }),
    ...(entry.expect.forbidCurrentlyHostedDependencies === undefined
      ? {}
      : { forbidCurrentlyHostedDependencies: entry.expect.forbidCurrentlyHostedDependencies })
  },
  deployment: {
    policy: 'never',
    costClass: 'high',
    reason: 'Real projects are packaged in full; AWS behavior is sampled through the explicit archetype scenarios.'
  }
});

export const BUILT_IN_RELEASE_CASES: readonly QualificationCaseManifest[] = REAL_PROJECT_CORPUS.map(fromBuiltInCase);
export const BUILT_IN_STRESS_CASES: readonly QualificationCaseManifest[] = stressCases.map(fromBuiltInCase);
export const BUILT_IN_CASES: readonly QualificationCaseManifest[] = [
  ...BUILT_IN_RELEASE_CASES,
  ...BUILT_IN_STRESS_CASES
];

export const casesForPreset = (preset: 'smoke' | 'release' | 'stress' | 'all'): QualificationCaseManifest[] => {
  if (preset === 'release') return [...BUILT_IN_RELEASE_CASES];
  if (preset === 'stress') return [...BUILT_IN_STRESS_CASES];
  if (preset === 'all') return [...BUILT_IN_CASES];
  return SMOKE_CASE_IDS.map((id) => {
    const entry = BUILT_IN_CASES.find((candidate) => candidate.id === id);
    if (entry === undefined) throw new Error(`Smoke qualification case ${id} is missing from the built-in corpus.`);
    return entry;
  });
};
