/**
 * What the CLI may report without a Stacktape account. Only these fields leave the machine: never project, stack,
 * stage or account names or IDs, paths, configuration or error messages. The distinct ID is the random install ID.
 */
export const ACCOUNT_FREE_TELEMETRY_FIELDS = [
  // Added to every event: which app and build sent it.
  'app',
  'environment',
  'schema_version',
  'app_version',
  'command',
  'outcome',
  'error_code',
  'platform',
  'arch',
  'is_ci'
] as const;

export type AccountFreeTelemetryField = (typeof ACCOUNT_FREE_TELEMETRY_FIELDS)[number];

/** The properties of an event reported without an account, reduced to the allowlist. */
export const toAccountFreeTelemetryProperties = (properties: Record<string, unknown>) =>
  Object.fromEntries(
    ACCOUNT_FREE_TELEMETRY_FIELDS.filter((field) => properties[field] !== undefined).map((field) => [
      field,
      properties[field]
    ])
  ) as Partial<Record<AccountFreeTelemetryField, unknown>>;

/** `CI` set to anything but `false` or `0`. */
export const isCiEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  Boolean(environment.CI) && !['false', '0'].includes(environment.CI!.toLowerCase());

/** What the first-run notice says; it is shown once, before anything is sent. */
export const TELEMETRY_NOTICE =
  'Stacktape sends anonymous usage data to improve the CLI: the command name, whether it succeeded, the error code, the CLI version, your OS and architecture, whether it runs in CI, and a random install ID. It never sends names, IDs, paths, configuration or error messages. To turn it off, set STP_DISABLE_TELEMETRY=1 or DO_NOT_TRACK=1.';
