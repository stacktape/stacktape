import type { EnvironmentVariableUse } from '../../facts/service';

export const normalizedSettingName = (name: string): string =>
  name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const SECRETISH_NAME = /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|APIKEY|ACCESS_KEY|CREDENTIAL|(?:^|_)KEY$/;

export const isSecretishDeclaredName = (name: string): boolean => SECRETISH_NAME.test(normalizedSettingName(name));

/**
 * Settings whose values are operational configuration by convention, not credentials or user
 * data. This is intentionally an allow-list: a vague `VALUE=...` still stays names-only.
 */
const SAFE_LITERAL_NAME =
  /^(?:NODE_ENV|RAILS_ENV|RACK_ENV|APP_ENV|ENVIRONMENT|DENO_ENV|LOG_LEVEL|RUST_LOG|DEBUG|TRACE|HOST|RAILS_LOG_TO_STDOUT|RAILS_SERVE_STATIC_FILES|PHX_SERVER|PROCESS_TYPE|USE_S3_STORAGE|AWS_FORCE_PATH_STYLE|DJANGO_DEBUG|DRY_RUN|SPRING_PROFILES_ACTIVE|[A-Z0-9_]*(?:ENVIRONMENT|PORTS?|CONCURRENCY|WORKERS?|THREADS?|ENABLED?|DISABLED?|REGION|STAGE|PROFILE|MODE|INTERVAL(?:_(?:MS|SECONDS|SECS|MINUTES))?|DURATION(?:_(?:MS|SECONDS|SECS|MINUTES))?|TIMEOUT(?:_(?:MS|SECONDS|SECS|MINUTES))?|RETENTION(?:_(?:DAYS|HOURS|MINUTES))?|BACKOFF(?:_BASE)?_(?:MS|SECONDS|SECS|MINUTES)|MAX_RETRIES|MAX_ATTEMPTS|RETRIES|BATCH_SIZE|PREFETCH_COUNT|LIMIT|SIZE(?:_MB)?|CHANCE|QUALITY|FORCE_PATH_STYLE|WORKER_ID|CONSUMER_GROUP|DRIVER|CLIENT|SCHEME|CHANNEL|PREFIX|DOMAIN|DISK|CLOUD|CONNECTION|MIGRATIONS?|MIGRATION_ISOLATION|STORAGE_LINK|[A-Z0-9]+_CACHE)|[A-Z0-9_]*(?:TOPIC|TOPICS)_[A-Z0-9_]+)$/;

/** Reduce a manifest scalar to a safe environment literal, or retain no value at all. */
export const safeDeclaredLiteral = (name: string, value: unknown): string | undefined => {
  const normalizedName = normalizedSettingName(name);
  if (!SAFE_LITERAL_NAME.test(normalizedName) || isSecretishDeclaredName(name)) return undefined;
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return undefined;
  let literal = String(value).trim();
  // Compose frequently states a configurable value as `${NAME:-production}`. The fallback is the
  // deployment's actual declared default; the interpolation expression itself is not useful on AWS.
  const interpolation = /^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-|-)([^}]*)\}$/.exec(literal);
  if (interpolation !== null) literal = interpolation[1]!.trim();
  if (
    literal === '' ||
    literal.length > 200 ||
    /[\r\n]/.test(literal) ||
    literal.includes(String.fromCharCode(0)) ||
    literal.includes('${')
  )
    return undefined;

  const isBooleanOrNumericLiteral =
    /^(?:true|false|0|1|yes|no|on|off)$/i.test(literal) || /^-?\d+(?:\.\d+)?$/.test(literal);
  if (isBooleanOrNumericLiteral) return literal;
  return literal;
};

/**
 * Classifies an environment entry that an infrastructure declaration assigns a value to.
 * CDK and Terraform expose different object syntaxes, but once a name and dependency binding
 * have been extracted they carry the same inference semantics.
 */
export const declaredEnvironmentVariable = ({
  name,
  dependencyName,
  evidence,
  value
}: {
  name: string;
  dependencyName: string | undefined;
  evidence: EnvironmentVariableUse['evidence'] | undefined;
  value?: unknown;
}): EnvironmentVariableUse => ({
  name,
  role:
    dependencyName !== undefined
      ? 'infra-dependency'
      : isSecretishDeclaredName(name)
        ? 'third-party-secret'
        : 'runtime-config',
  ...(dependencyName === undefined ? {} : { dependencyName }),
  hasDeclaredValue: true,
  ...(dependencyName !== undefined || isSecretishDeclaredName(name)
    ? {}
    : safeDeclaredLiteral(name, value) === undefined
      ? {}
      : { safeLiteralValue: safeDeclaredLiteral(name, value) }),
  required: true,
  evidence: evidence ?? []
});
