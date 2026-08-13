/**
 * How much infrastructure to ask for.
 *
 * One choice, made once, that sets every size and safety setting in the composed configuration. It
 * exists because it is the only question whose answer we genuinely cannot infer — the same code
 * deployed by two people can legitimately want the cheapest possible environment or a redundant one,
 * and nothing in the repository says which.
 *
 * Everything else the wizard used to ask is inferred and then *shown*, because a wrong guess about
 * a start command is visible and fixable, while a wrong guess about spend is a surprise bill.
 *
 * The values are deliberately boring. They are the settings a careful person would pick, not the
 * ones that demo well: small instances, one copy of everything until traffic says otherwise, and
 * protection turned on the moment the environment is described as one people rely on.
 */

export type InfrastructureMode = 'low-cost' | 'standard' | 'production';

export type ModeProfile = {
  /** Container sizing for every service we create. */
  container: { cpu: number; memory: number };
  scaling: { minInstances: number; maxInstances: number };
  database: {
    instanceSize: string;
    /** A standby in a second availability zone. Doubles the database cost and survives an AZ outage. */
    multiAz: boolean;
    deletionProtection: boolean;
    backupRetentionDays: number;
  };
  redis: { instanceSize: string };
  bucket: { versioning: boolean };
};

export const MODE_PROFILES: Record<InfrastructureMode, ModeProfile> = {
  'low-cost': {
    container: { cpu: 0.25, memory: 512 },
    scaling: { minInstances: 1, maxInstances: 1 },
    database: {
      instanceSize: 'db.t4g.micro',
      multiAz: false,
      deletionProtection: false,
      // One day, because a throwaway environment that keeps two weeks of backups is paying for
      // storage nobody will ever restore.
      backupRetentionDays: 1
    },
    redis: { instanceSize: 'cache.t4g.micro' },
    bucket: { versioning: false }
  },
  standard: {
    container: { cpu: 0.5, memory: 1024 },
    scaling: { minInstances: 1, maxInstances: 3 },
    database: {
      instanceSize: 'db.t4g.small',
      multiAz: false,
      // On the moment it stops being a toy: deleting a database by accident is the one mistake with
      // no undo, and the protection costs nothing.
      deletionProtection: true,
      backupRetentionDays: 7
    },
    redis: { instanceSize: 'cache.t4g.micro' },
    bucket: { versioning: true }
  },
  production: {
    container: { cpu: 1, memory: 2048 },
    scaling: { minInstances: 2, maxInstances: 10 },
    database: {
      instanceSize: 'db.t4g.medium',
      multiAz: true,
      deletionProtection: true,
      backupRetentionDays: 14
    },
    redis: { instanceSize: 'cache.t4g.small' },
    bucket: { versioning: true }
  }
};

export const DEFAULT_MODE: InfrastructureMode = 'standard';

/**
 * What each mode means, for the one screen that offers the choice.
 *
 * Written for someone whose last deployment was `git push heroku main`. No availability zones, no
 * instance classes — what it survives, and what to pick.
 *
 * `meta` used to carry a monthly price. The prices were invented: nothing computed them, and they
 * were shown before the scan, so they could not have known whether the project needs a database at
 * all. Real pricing lives in `packages/pricing`, which needs network access and a Stacktape-owned
 * table, and `init` is meant to work with neither. A relative hint is true; a made-up number is not.
 */
export const MODE_DESCRIPTIONS: Record<InfrastructureMode, { title: string; description: string; meta: string }> = {
  'low-cost': {
    title: 'Cheapest',
    description: 'One small copy of everything. Perfect for trying this out, a side project, or a staging environment.',
    meta: 'Smallest sizes'
  },
  standard: {
    title: 'Balanced',
    description:
      'Room to handle real traffic, backups kept for a week, and your database protected from accidental deletion.',
    meta: 'Costs more'
  },
  production: {
    title: 'Production',
    description:
      'Two copies of your app so a single failure changes nothing, and a standby database in another datacentre.',
    meta: 'Costs the most'
  }
};
