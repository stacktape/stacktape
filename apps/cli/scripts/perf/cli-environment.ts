/**
 * The environment a measured CLI process gets: nothing inherited from the shell that starts the measurement.
 *
 * - `HOME` is an owned directory, so the user's Stacktape state, AWS files, npm and Docker configuration are not read.
 * - AWS credentials are the documented AWS example values: inert everywhere. `AWS_ENDPOINT_URL` sends every AWS SDK
 *   request to the local fixture; the shared config and credentials files point at paths that do not exist, and the
 *   EC2 metadata endpoint is disabled.
 * - Telemetry goes to the fixture through `POSTHOG_HOST`; other HTTP(S) clients that honor the standard proxy
 *   variables go to the fixture's proxy, and loopback is exempt.
 * - PATH is built from owned directories only: the tools the command needs, and either the system directories or a
 *   copy of them without Docker.
 *
 * None of this confines a client that ignores these settings. The network sandbox does that.
 *
 * A caller may add only the keys in `EXTRA_ENVIRONMENT_KEYS`: Docker's configuration directory, `CI`, and the owned
 * cache and state locations of npm and pnpm. Any other extra key is refused, so an extra can never replace the inert
 * credentials, the fixture endpoints, the proxies, PATH, HOME, the timing destination or the sandbox settings.
 */
import { lstat, mkdir, readdir, symlink } from 'node:fs/promises';
import { delimiter, join } from 'node:path';

/** AWS's documented example credentials: they authenticate nothing. */
export const INERT_AWS_CREDENTIALS = {
  AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
  AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
};

/** Links each named executable, as found on the current PATH, into `directory`. */
export const createToolDirectory = async ({ directory, tools }: { directory: string; tools: string[] }) => {
  await mkdir(directory, { recursive: true });
  const linked: Record<string, string> = {};
  for (const tool of tools) {
    const path = Bun.which(tool);
    if (!path) throw new Error(`\`${tool}\` is not on PATH.`);
    await symlink(path, join(directory, tool));
    linked[tool] = path;
  }
  return linked;
};

/** Whether a name is part of a Docker installation: the CLI, its credential helpers, Compose. */
export const isDockerExecutableName = (name: string) =>
  name === 'docker' || name.startsWith('docker-') || name.startsWith('com.docker');

/**
 * Links every entry of `sourceDirectories` into `directory` except Docker's, first directory first, so a PATH made of
 * it finds every system tool and no Docker CLI.
 */
export const createPathWithoutDocker = async ({
  directory,
  sourceDirectories
}: {
  directory: string;
  sourceDirectories: string[];
}) => {
  await mkdir(directory, { recursive: true });
  const excluded: string[] = [];
  const linked = new Set<string>();
  for (const source of sourceDirectories) {
    for (const name of await readdir(source)) {
      if (linked.has(name)) continue;
      if (isDockerExecutableName(name)) {
        excluded.push(`${source}/${name}`);
        continue;
      }
      if ((await lstat(join(source, name)).catch(() => null)) === null) continue;
      await symlink(join(source, name), join(directory, name));
      linked.add(name);
    }
  }
  return { directory, excluded, linked: linked.size };
};

/** The only keys `getCliEnvironment` accepts in `extra`. */
export const EXTRA_ENVIRONMENT_KEYS = [
  'DOCKER_CONFIG',
  'CI',
  'npm_config_cache',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'XDG_STATE_HOME',
  'PNPM_HOME'
] as const;

/** Refuses any extra key outside `EXTRA_ENVIRONMENT_KEYS`, and any value that is not a non-empty string. */
export const checkExtraEnvironment = (extra: Record<string, string>) => {
  for (const [key, value] of Object.entries(extra)) {
    if (!(EXTRA_ENVIRONMENT_KEYS as readonly string[]).includes(key)) {
      throw new Error(`The measured environment does not accept the extra key ${key}.`);
    }
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`The extra environment key ${key} needs a non-empty string value.`);
    }
  }
  return extra;
};

export const getCliEnvironment = ({
  home,
  path,
  serviceUrl,
  proxyUrl,
  timingsFile,
  extra = {}
}: {
  home: string;
  path: string[];
  /** The fixture's service URL; omitted only by the negative test, which must reach nothing. */
  serviceUrl?: string | undefined;
  proxyUrl?: string | undefined;
  timingsFile?: string | undefined;
  extra?: Record<string, string>;
}): Record<string, string> => ({
  HOME: home,
  // The bytecode qualification also runs this environment on Windows, whose PATH is `;`-separated.
  PATH: path.join(delimiter),
  LANG: 'C.UTF-8',
  ...INERT_AWS_CREDENTIALS,
  AWS_CONFIG_FILE: join(home, 'no-aws-config'),
  AWS_SHARED_CREDENTIALS_FILE: join(home, 'no-aws-credentials'),
  AWS_EC2_METADATA_DISABLED: 'true',
  ...(serviceUrl && { AWS_ENDPOINT_URL: serviceUrl, POSTHOG_HOST: serviceUrl }),
  ...(proxyUrl && {
    HTTPS_PROXY: proxyUrl,
    HTTP_PROXY: proxyUrl,
    https_proxy: proxyUrl,
    http_proxy: proxyUrl,
    NO_PROXY: '127.0.0.1,localhost',
    no_proxy: '127.0.0.1,localhost'
  }),
  ...(timingsFile && { STP_TIMINGS_FILE: timingsFile }),
  ...checkExtraEnvironment(extra)
});
