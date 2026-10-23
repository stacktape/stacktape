import { scrubSensitiveText } from '@stacktape/console-api/sensitive-text';

const REDACTED = '[redacted]';

/** A variable name that says its value is secret: `DB_PASSWORD`, `STRIPE_KEY`, `apiKey`, `AWS_SESSION_TOKEN`. */
const SENSITIVE_NAME =
  /password|passwd|pwd|secret|token|credential|authorization|cookie|signature|private[_-]?key|api[_-]?key|access[_-]?key|session[_-]?id|(?:^|[_.-])key(?:$|[_.-])/i;
const CAMEL_CASE_KEY = /[a-z0-9]Key(?![a-z])/;

const SECRET_DIRECTIVE = /\$(?:Secret|SsmParam)\(/;

/**
 * Names of the variables whose configured value reads a secret: a `$Secret` or `$SsmParam` directive anywhere in the
 * value, or a container's `secrets` entry. Their resolved values look like any other string, so only the configuration
 * tells them apart.
 */
export const getSecretSourcedEnvNames = (resource: unknown): Set<string> => {
  const names = new Set<string>();
  if (!resource || typeof resource !== 'object') return names;
  const scan = (environment: unknown, valueKey: 'value' | 'valueFrom' = 'value') => {
    if (Array.isArray(environment)) {
      for (const entry of environment) {
        if (!entry || typeof entry.name !== 'string') continue;
        if (valueKey === 'valueFrom' || (typeof entry.value === 'string' && SECRET_DIRECTIVE.test(entry.value))) {
          names.add(entry.name);
        }
      }
    } else if (environment && typeof environment === 'object') {
      for (const [name, value] of Object.entries(environment)) {
        if (typeof value === 'string' && SECRET_DIRECTIVE.test(value)) names.add(name);
      }
    }
  };
  const { environment, injectEnvironment, containers, secrets } = resource as Record<string, unknown>;
  scan(environment);
  scan(injectEnvironment);
  scan(secrets, 'valueFrom');
  if (Array.isArray(containers)) {
    for (const container of containers) {
      scan(container?.environment);
      scan(container?.secrets, 'valueFrom');
    }
  }
  return names;
};

/**
 * The environment the dev agent's `/env` route returns. Values under secret names or read from secrets are replaced,
 * and the rest go through the shared scrubber, which masks the password in connection strings and known token formats.
 * Hosts, ports, database names and plain settings stay readable, because those are what a developer checks.
 */
export const maskAgentEnvironment = (
  environment: Record<string, string>,
  secretNames: ReadonlySet<string> = new Set()
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(environment).map(([name, value]) => [
      name,
      secretNames.has(name) || SENSITIVE_NAME.test(name) || CAMEL_CASE_KEY.test(name)
        ? REDACTED
        : scrubSensitiveText(String(value))
    ])
  );
