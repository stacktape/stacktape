export const serializeEnvironment = (environment: NodeJS.ProcessEnv): Record<string, string> =>
  Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => entry[1] !== undefined));

/**
 * The environment for a build Stacktape runs on this machine (a framework build, a hosting bucket build). pnpm 11
 * re-checks dependencies before every `pnpm run` and fails that check on a dependency build script the project has
 * not approved; the script stays skipped, only the failing exit is turned off. A value the user set wins.
 */
export const hostBuildEnvironment = (environment: NodeJS.ProcessEnv): Record<string, string> => ({
  pnpm_config_strict_dep_builds: 'false',
  ...serializeEnvironment(environment)
});
