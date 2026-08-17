/**
 * Environment variables owned by Stacktape, the runtime, or the operating system.
 *
 * A source read or a value repeated in another platform's manifest is not a user configuration
 * requirement for these names. Emitting a `$Secret()` for one creates needless setup work and can
 * override the value Stacktape needs for routing or runtime behavior.
 */
const PLATFORM_ENVIRONMENT_VARIABLES: ReadonlySet<string> = new Set([
  'PATH',
  'HOME',
  'USER',
  'USERNAME',
  'USERPROFILE',
  'SHELL',
  'PWD',
  'LANG',
  'LC_ALL',
  'TERM',
  'HOSTNAME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'TZ',
  'CI',
  'NODE_ENV',
  'NODE_OPTIONS',
  'PORT',
  'HOST',
  'PYTHONPATH',
  'PYTHONUNBUFFERED',
  'VIRTUAL_ENV',
  'GOPATH',
  'GOROOT',
  'JAVA_HOME',
  'CLASSPATH',
  'LD_LIBRARY_PATH',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_REGION',
  'AWS_DEFAULT_REGION',
  'AWS_PROFILE',
  'AWS_EXECUTION_ENV',
  'AWS_LAMBDA_FUNCTION_NAME',
  'AWS_LAMBDA_FUNCTION_VERSION',
  'LAMBDA_TASK_ROOT',
  'GITHUB_ACTIONS',
  'GITHUB_WORKSPACE'
]);

export const isPlatformEnvironmentVariable = (name: string): boolean =>
  PLATFORM_ENVIRONMENT_VARIABLES.has(name.toUpperCase());
