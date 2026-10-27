/**
 * The small set of infrastructure trade-offs repository evidence cannot answer.
 *
 * These are deliberately separate from facts and assumptions. Facts describe what exists in the
 * repository; assumptions resolve ambiguous observations. Preferences are the user's cost,
 * resilience, retention, and network-boundary choices. Keeping the boundary explicit means a
 * repair agent can never rewrite them while correcting a repository fact.
 */

import type { ProjectFacts } from '../facts/project-facts';
import { classifyService } from './classify';

export type CapacityPreference = 'economical' | 'balanced' | 'performance';
export type AvailabilityPreference = 'single' | 'redundant';
export type DataProtectionPreference = 'lean' | 'protected';
export type DatabaseAccessPreference = 'public' | 'private';

export type DeploymentPreferences = {
  capacity: CapacityPreference;
  availability: AvailabilityPreference;
  dataProtection: DataProtectionPreference;
  databaseAccess: DatabaseAccessPreference;
};

export type DeploymentPreferenceKey = keyof DeploymentPreferences;

export type DeploymentPreferenceChange = {
  [Key in DeploymentPreferenceKey]: { key: Key; value: DeploymentPreferences[Key] };
}[DeploymentPreferenceKey];

export const DEPLOYMENT_PREFERENCE_OPTIONS = {
  capacity: ['economical', 'balanced', 'performance'],
  availability: ['single', 'redundant'],
  dataProtection: ['lean', 'protected'],
  databaseAccess: ['public', 'private']
} as const satisfies { [Key in DeploymentPreferenceKey]: readonly DeploymentPreferences[Key][] };

export const isDeploymentPreferenceChange = (input: unknown): input is DeploymentPreferenceChange => {
  if (typeof input !== 'object' || input === null) return false;
  const candidate = input as { key?: unknown; value?: unknown };
  const keys = Object.keys(candidate);
  if (keys.length !== 2 || !keys.includes('key') || !keys.includes('value')) return false;
  if (typeof candidate.key !== 'string' || typeof candidate.value !== 'string') return false;
  if (!(candidate.key in DEPLOYMENT_PREFERENCE_OPTIONS)) return false;
  return (DEPLOYMENT_PREFERENCE_OPTIONS[candidate.key as DeploymentPreferenceKey] as readonly string[]).includes(
    candidate.value
  );
};

export type InfrastructureProfile = {
  container: { cpu: number; memory: number };
  scaling: { minInstances: number; maxInstances: number };
  database: {
    instanceSize: string;
    multiAz: boolean;
    /** Cost-free guardrail. Retention preferences never turn this off. */
    deletionProtection: true;
    backupRetentionDays: 1 | 7 | 14;
  };
  redis: { instanceSize: string };
  bucket: { versioning: boolean };
};

export const DEFAULT_DEPLOYMENT_PREFERENCES: DeploymentPreferences = {
  capacity: 'balanced',
  availability: 'single',
  dataProtection: 'protected',
  databaseAccess: 'private'
};

const RELATIONAL_DATABASE_KINDS = new Set(['postgres', 'mysql', 'mssql']);

/**
 * Whether a private database is a safe first-deploy default for this repository graph.
 *
 * Containers and batch jobs already run in Stacktape's VPC. Lambda-backed resources must join the
 * VPC to reach a private database, which removes their direct internet access. We still let the
 * user choose that trade-off explicitly, but we do not make it the default for a serverless graph.
 */
export const privateDatabaseIsSafeDefault = (facts: ProjectFacts): boolean => {
  const relationalConsumers = new Set(
    facts.dependencies
      .filter((dependency) => RELATIONAL_DATABASE_KINDS.has(dependency.kind))
      .flatMap((dependency) => dependency.consumedBy)
  );
  return !facts.services.some((service) => {
    if (!relationalConsumers.has(service.name)) return false;
    const resourceType = classifyService(service).resourceType;
    if (resourceType !== 'function' && !resourceType.endsWith('-web')) return false;
    // Redis is always VPC-only, so this serverless workload already has to join the VPC. Making its
    // SQL database private does not remove internet access it would otherwise retain.
    const alreadyRequiresVpc = facts.dependencies.some(
      (dependency) => dependency.kind === 'redis' && dependency.consumedBy.includes(service.name)
    );
    return !alreadyRequiresVpc;
  });
};

export const defaultDeploymentPreferences = (facts: ProjectFacts): DeploymentPreferences => ({
  ...DEFAULT_DEPLOYMENT_PREFERENCES,
  databaseAccess: privateDatabaseIsSafeDefault(facts) ? 'private' : 'public'
});

export const profileForPreferences = (preferences: DeploymentPreferences): InfrastructureProfile => {
  const capacity = {
    economical: {
      container: { cpu: 0.25, memory: 512 },
      maxInstances: 1,
      databaseInstanceSize: 'db.t4g.micro',
      redisInstanceSize: 'cache.t4g.micro'
    },
    balanced: {
      container: { cpu: 0.5, memory: 1024 },
      maxInstances: 3,
      databaseInstanceSize: 'db.t4g.small',
      redisInstanceSize: 'cache.t4g.micro'
    },
    performance: {
      container: { cpu: 1, memory: 2048 },
      maxInstances: 10,
      databaseInstanceSize: 'db.t4g.medium',
      redisInstanceSize: 'cache.t4g.small'
    }
  }[preferences.capacity];
  const minInstances = preferences.availability === 'redundant' ? 2 : 1;

  return {
    container: capacity.container,
    scaling: { minInstances, maxInstances: Math.max(minInstances, capacity.maxInstances) },
    database: {
      instanceSize: capacity.databaseInstanceSize,
      multiAz: preferences.availability === 'redundant',
      deletionProtection: true,
      backupRetentionDays: preferences.dataProtection === 'protected' ? 7 : 1
    },
    redis: { instanceSize: capacity.redisInstanceSize },
    bucket: { versioning: preferences.dataProtection === 'protected' }
  };
};
