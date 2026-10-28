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

/** A private IPv4 address (10/8, 172.16/12, 192.168/16), such as the dev box that relays local databases. */
const PRIVATE_IPV4 = /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g;
const HELD = /\uE000(\d+)\uE000/g;

/**
 * The shared scrubber masks every IP address that is not loopback, because its output can leave the developer's
 * machine. `/env` answers only the developer's own agent, and a private address identifies no one outside its network
 * while it is the host a deployed dev function connects to, so private addresses stay readable here.
 */
const scrubKeepingPrivateAddresses = (value: string): string => {
  const held: string[] = [];
  const scrubbed = scrubSensitiveText(value.replace(PRIVATE_IPV4, (ip) => `\uE000${held.push(ip) - 1}\uE000`));
  return scrubbed.replace(HELD, (_match, index: string) => held[Number(index)]);
};

/**
 * The environment the dev agent's `/env` route returns. Values under secret names or read from secrets are replaced,
 * and the rest go through the shared scrubber, which masks the password in connection strings and known token formats.
 * Hosts, private addresses, ports, database names and plain settings stay readable, because those are what a developer
 * checks.
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
        : scrubKeepingPrivateAddresses(String(value))
    ])
  );

/** Shorter values (ports, flags, counts) also appear in text that holds no secret, such as line numbers. */
const MIN_MASKED_VALUE_LENGTH = 6;

/**
 * `text` with every value of `environment` that `/env` masks replaced by its masked form, then through the same
 * scrubber. Output the app wrote, such as a crash summary, can quote a secret it read: `raise ENV.inspect`.
 */
export const maskEnvironmentValuesInText = (
  text: string,
  environment: Record<string, string>,
  secretNames: ReadonlySet<string> = new Set()
): string => {
  const masked = maskAgentEnvironment(environment, secretNames);
  const secrets = Object.entries(environment)
    .filter(([name, value]) => String(value).length >= MIN_MASKED_VALUE_LENGTH && masked[name] !== String(value))
    // A longer value first, so a value that contains another is replaced whole.
    .sort(([, first], [, second]) => String(second).length - String(first).length);
  const replaced = secrets.reduce((result, [name, value]) => result.replaceAll(String(value), masked[name]!), text);
  return scrubKeepingPrivateAddresses(replaced);
};
