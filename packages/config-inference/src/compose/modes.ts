/**
 * Compatibility presets for headless v4 callers.
 *
 * The browser no longer combines capacity, availability, retention, and networking under one
 * ambiguous label. These mappings keep the old CLI vocabulary deterministic and, critically, keep
 * its databases public rather than changing existing automation's connectivity contract.
 */

export type InfrastructureMode = 'low-cost' | 'standard' | 'production';

import { profileForPreferences, type DeploymentPreferences, type InfrastructureProfile } from './preferences';

/** @deprecated Modes are legacy CLI presets. The browser wizard uses explicit preferences. */
export type ModeProfile = InfrastructureProfile;

export const MODE_PREFERENCES: Record<InfrastructureMode, DeploymentPreferences> = {
  'low-cost': {
    capacity: 'economical',
    availability: 'single',
    dataProtection: 'lean',
    // Preserve the old mode's connectivity contract. Private networking is an explicit choice.
    databaseAccess: 'public'
  },
  standard: {
    capacity: 'balanced',
    availability: 'single',
    dataProtection: 'protected',
    databaseAccess: 'public'
  },
  production: {
    capacity: 'performance',
    availability: 'redundant',
    dataProtection: 'protected',
    databaseAccess: 'public'
  }
};

export const MODE_PROFILES: Record<InfrastructureMode, ModeProfile> = {
  'low-cost': profileForPreferences(MODE_PREFERENCES['low-cost']),
  standard: profileForPreferences(MODE_PREFERENCES.standard),
  production: {
    ...profileForPreferences(MODE_PREFERENCES.production),
    // Preserve the historical production preset's two-week retention. Explicit preferences use
    // the simpler one-day / one-week contract shown in the wizard.
    database: { ...profileForPreferences(MODE_PREFERENCES.production).database, backupRetentionDays: 14 }
  }
};

/** @deprecated New callers should omit a mode and use inferred preference recommendations. */
export const DEFAULT_MODE: InfrastructureMode = 'standard';

/**
 * Legacy display copy retained for API consumers that still render the compatibility presets.
 *
 * Written for someone whose last deployment was `git push heroku main`. No availability zones, no
 * instance classes — what it survives, and what to pick.
 *
 * `meta` used to carry a monthly price. The prices were invented: nothing computed them, and they
 * were shown before the scan, so they could not have known whether the project needs a database at
 * all. Real pricing lives in `packages/pricing`, which needs network access and a Stacktape-owned
 * table, and `init` is meant to work with neither. A relative hint is true; a made-up number is not.
 */
/** @deprecated The Stacktape init UI renders independent preference copy. */
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
      'Two copies of your app and a standby database in a second datacentre, so one machine failing does not take you down.',
    meta: 'Costs the most'
  }
};
