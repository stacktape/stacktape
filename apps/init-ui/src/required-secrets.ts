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
  const visit = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      if (GENERATED_PATHS.some((pattern) => pattern.test(path))) return;
      for (const match of value.matchAll(SECRET_REFERENCE)) names.add(match[1]!);
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
  return [...names].toSorted();
};

/** The command that creates one secret. The value is prompted for, so it never lands in shell history. */
export const secretCommand = (name: string, region: string): string =>
  `stacktape secret:set --secretName ${name} --region ${region}`;
