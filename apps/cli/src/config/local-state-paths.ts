import { join } from 'node:path';
import { getHomeDir } from '@utils/misc';

/**
 * Authoritative paths for hidden state that Stacktape itself writes to the machine running the CLI.
 *
 * Retention is intentionally visible in the API:
 *
 * - User-persistent: CLI defaults, machine identity and authentication state in `persistedStateFile`; native-install
 *   binaries in `nativeInstallBinDirectory`; and local development proxy routes, CA and private keys in
 *   `devProxyDirectory`.
 * - Project-persistent: local development database contents in `devResourceDataDirectory` (until `dev --freshDb`).
 * - Runtime coordination: dev-agent logs and lock files, plus dependency-install hashes and locks.
 * - Invocation-temporary: `invocationDirectory`; normal commands remove it unless temporary files are preserved,
 *   while `package` deliberately leaves its artifacts for the caller.
 * - Operation-temporary: `downloadedTemplateFile` and `starterArchiveFile`; their owners remove them after use.
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
  nativeInstallBinDirectory() {
    return join(localStatePaths.userDataDirectory(), 'bin');
  },
  devProxyDirectory() {
    return process.env.STACKTAPE_DEV_PROXY_STATE_DIR || join(localStatePaths.userDataDirectory(), 'dev-proxy');
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
  devAgentDirectory({ workingDirectory }: { workingDirectory: string }) {
    return join(localStatePaths.projectStateDirectory({ workingDirectory }), 'dev-agent');
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
  downloadedTemplateFile({ workingDirectory, id }: { workingDirectory: string; id: string }) {
    return join(workingDirectory, `.stacktape-template-${id}.stp.ts`);
  },
  starterArchiveFile({ targetDirectory, id }: { targetDirectory: string; id: string | number }) {
    return join(targetDirectory, `.stacktape-starter-${id}.zip`);
  }
};
