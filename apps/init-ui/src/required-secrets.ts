/**
 * The secrets a deploy will ask for.
 *
 * The configuration references secrets as `$Secret('name')` or `$Secret('name.key')`. The deploy creates database
 * passwords by itself (the same fields `ensureMissingSecretsCreated` treats as generable); every other secret must
 * exist in the region first, and a deploy started from the wizard runs non-interactively, so it stops with "Missing
 * secret" instead of asking. Listing them here, with the command that creates each, is the difference between a
 * first deploy and a first failure.
 */

const SECRET_REFERENCE = /\$Secret\('([^'.]+)(?:\.[^']*)?'\)/g;

/** Property paths whose secret the deploy generates: relational, Redis and MongoDB Atlas passwords. */
const GENERATED_PATHS: readonly RegExp[] = [
  /(^|\.)masterUserPassword$/,
  /(^|\.)defaultUserPassword$/,
  /(^|\.)adminUserCredentials\.password$/
];

export const requiredSecrets = (resources: Record<string, unknown>): string[] => {
  const names = new Set<string>();
  // A generated secret stays generated wherever else it is referenced (an app reading the database password from
  // its environment), the same way the deploy's preflight classifies it by name.
  const generated = new Set<string>();
  const visit = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      const target = GENERATED_PATHS.some((pattern) => pattern.test(path)) ? generated : names;
      for (const match of value.matchAll(SECRET_REFERENCE)) target.add(match[1]!);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}.${index}`));
      return;
    }
    if (typeof value === 'object' && value !== null) {
      for (const [key, entry] of Object.entries(value)) visit(entry, path === '' ? key : `${path}.${key}`);
    }
  };
  visit(resources, '');
  return [...names].filter((name) => !generated.has(name)).toSorted();
};

/** The command that creates one secret. The value is prompted for, so it never lands in shell history. */
export const secretCommand = (name: string, region: string, awsAccount?: string): string =>
  `stacktape secret:set --secretName ${name} --region ${region}${awsAccount === undefined ? '' : ` --awsAccount ${awsAccount}`}`;

/**
 * The variables those secrets reach the app as, for a reader who knows `SESSION_SECRET` and not `session_secret`.
 * A secret referenced outside an `environment` list keeps its own name.
 */
export const requiredSecretVariables = (resources: Record<string, unknown>): string[] => {
  const secrets = new Set(requiredSecrets(resources));
  const variables = new Set<string>();
  const covered = new Set<string>();
  for (const resource of Object.values(resources)) {
    const environment = (resource as { properties?: { environment?: unknown } }).properties?.environment;
    if (!Array.isArray(environment)) continue;
    for (const entry of environment as Array<{ name?: unknown; value?: unknown }>) {
      if (typeof entry.name !== 'string' || typeof entry.value !== 'string') continue;
      for (const match of entry.value.matchAll(SECRET_REFERENCE)) {
        if (!secrets.has(match[1]!)) continue;
        variables.add(entry.name);
        covered.add(match[1]!);
      }
    }
  }
  return [...[...variables].toSorted(), ...[...secrets].filter((name) => !covered.has(name))];
};
