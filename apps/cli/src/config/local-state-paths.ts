import { join } from 'node:path';
import { getHomeDir } from '@utils/misc';

/**
 * Authoritative paths for hidden state that Stacktape itself writes to the machine running the CLI.
 *
 * Retention is intentionally visible in the API:
 *
 * - User-persistent: CLI defaults, machine identity and authentication state in `persistedStateFile`; native-install
 *   binaries in `nativeInstallBinDirectory`; local development proxy routes, CA and private keys in
 *   `devProxyDirectory`; downloaded, checksum-verified tool binaries (the scanner with its caches, railpack and
 *   the Session Manager plugin) in `toolsDirectory` (one directory per tool and version, so an upgrade never
 *   overwrites a binary in use; old versions may be deleted);
 *   the last fetched update notice and announcements in `noticesCacheFile`, replaced by a newer fetch and safe to
 *   delete at any time; the caller identity STS returned for each access key in `awsIdentityCacheFile`, kept a
 *   day and safe to delete at any time; and when each base image of Stacktape's generated Dockerfiles was last
 *   pulled in `baseImagePullsFile`, kept a day and safe to delete at any time.
 * - User-runtime: the session token of each running dev agent in `devAgentTokenFile`, keyed by the agent's port so
 *   any local client that knows the port finds it; the agent removes it on stop and prunes those of dead agents.
 * - Project-persistent: local development database contents in `devResourceDataDirectory` (until `dev --freshDb`),
 *   and the generated password of each such database in `devResourcePasswordFile`.
 * - Runtime coordination: dev-agent logs and lock files, plus dependency-install hashes and locks.
 * - Invocation-temporary: `invocationDirectory`; normal commands remove it unless temporary files are preserved,
 *   while `package` deliberately leaves its artifacts for the caller.
 * - Operation-temporary: `starterArchiveFile`; its owner removes it after use.
 *
 * This module does not own paths explicitly chosen by the user (`synth` output, stack-info output, `.env`, initialized
 * projects), third-party configuration edited by `mcp-add`, standard AWS files, installed package-manager caches, or
 * the independently shipped native installer scripts.
 * Add new hidden Stacktape state here so its scope and cleanup policy are reviewed instead of being buried at a
 * write call site.
 */
export const localStatePaths = {
  userDataDirectory() {
    return join(getHomeDir(), '.stacktape');
  },
  persistedStateFile() {
    return join(localStatePaths.userDataDirectory(), 'persisted-state.json');
  },
  noticesCacheFile() {
    return join(localStatePaths.userDataDirectory(), 'notices.json');
  },
  awsIdentityCacheFile() {
    return join(localStatePaths.userDataDirectory(), 'aws-identity-cache.json');
  },
  baseImagePullsFile() {
    return join(localStatePaths.userDataDirectory(), 'base-image-pulls.json');
  },
  nativeInstallBinDirectory() {
    return join(localStatePaths.userDataDirectory(), 'bin');
  },
  devProxyDirectory() {
    return process.env.STACKTAPE_DEV_PROXY_STATE_DIR || join(localStatePaths.userDataDirectory(), 'dev-proxy');
  },
  toolsDirectory() {
    return process.env.STACKTAPE_TOOLS_DIR || join(localStatePaths.userDataDirectory(), 'tools');
  },
  toolDirectory({ tool, version }: { tool: string; version: string }) {
    return join(localStatePaths.toolsDirectory(), tool, version);
  },
  projectStateDirectory({ workingDirectory }: { workingDirectory: string }) {
    return join(workingDirectory, '.stacktape');
  },
  invocationDirectory({
    commandWorkingDirectory,
    invocationId
  }: {
    commandWorkingDirectory: string;
    invocationId: string;
  }) {
    return join(localStatePaths.projectStateDirectory({ workingDirectory: commandWorkingDirectory }), invocationId);
  },
  devResourceDataDirectory({
    workingDirectory,
    stage,
    resourceName
  }: {
    workingDirectory: string;
    stage: string;
    resourceName: string;
  }) {
    return join(localStatePaths.projectStateDirectory({ workingDirectory }), 'dev-data', stage, resourceName, 'data');
  },
  /** Generated password of a local database whose configuration sets none; `--freshDb` replaces it with its data. */
  devResourcePasswordFile({
    workingDirectory,
    stage,
    resourceName
  }: {
    workingDirectory: string;
    stage: string;
    resourceName: string;
  }) {
    return join(
      localStatePaths.projectStateDirectory({ workingDirectory }),
      'dev-data',
      stage,
      resourceName,
      'password'
    );
  },
  devAgentDirectory({ workingDirectory }: { workingDirectory: string }) {
    return join(localStatePaths.projectStateDirectory({ workingDirectory }), 'dev-agent');
  },
  /** Directory readable only by its user; the override isolates tests from the user's running agents. */
  devAgentTokenDirectory() {
    return process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR || join(localStatePaths.userDataDirectory(), 'dev-agent-tokens');
  },
  /** Session token of the dev agent listening on `port`, readable only by its user. */
  devAgentTokenFile({ port }: { port: number }) {
    return join(localStatePaths.devAgentTokenDirectory(), `${port}.token`);
  },
  devAgentRegistryDirectory({ workingDirectory }: { workingDirectory: string }) {
    return join(localStatePaths.projectStateDirectory({ workingDirectory }), 'dev-agents');
  },
  dependencyInstallHashFile({ installDirectory }: { installDirectory: string }) {
    return join(installDirectory, 'node_modules', '.stacktape-install-hash');
  },
  dependencyInstallLockFile({ installDirectory }: { installDirectory: string }) {
    return join(installDirectory, '.stacktape-install.lock');
  },
  starterArchiveFile({ targetDirectory, id }: { targetDirectory: string; id: string | number }) {
    return join(targetDirectory, `.stacktape-starter-${id}.zip`);
  }
};
