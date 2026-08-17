/**
 * Packaging a workspace member so its internal imports actually resolve.
 *
 * Monorepos are the most breakage-dense shape this pipeline meets, and the breakage is packaging:
 * Nixpacks pointed at `apps/web` runs the install there, where `@acme/ui` is a `workspace:*`
 * specifier no registry can satisfy — the build fails before the first resource exists. The fix is
 * the one every workspace tool documents: install and build from the repository root, then start
 * the one member. Nixpacks' root detection handles the install (it sees the root lockfile); the
 * build and start commands are overridden with the package manager's own filter syntax.
 *
 * Everything here is derived from proven facts — the workspace membership, the package name, the
 * manager from its lockfile, and the existence of `build`/`start` scripts — and the package name is
 * shape-checked before it lands inside a shell command, because workspace facts are agent-mergeable
 * and these strings become `executeCommand`s.
 */

import type { PackageManager } from '../facts/project-facts';
import type { ServiceFact } from '../facts/service';

/** What a package name may look like before it is interpolated into a command. */
const SAFE_PACKAGE_NAME = /^[@a-zA-Z0-9._/-]+$/;

type FilteredCommands = {
  /** Builds the member — and, where the manager can express it, the workspace packages it imports. */
  build: string;
  start: string;
  /** True when the manager cannot build the member's internal dependencies in one command. */
  partialBuild: boolean;
};

const FILTERED_COMMANDS: Partial<Record<PackageManager, (pkg: string) => FilteredCommands>> = {
  // `--filter <pkg>...` includes the package and everything it depends on; packages without a
  // `build` script are skipped rather than failing the run.
  pnpm: (pkg) => ({
    build: `pnpm --filter ${pkg}... run build`,
    start: `pnpm --filter ${pkg} start`,
    partialBuild: false
  }),
  // npm has no dependency-aware filter, but building every workspace is correct, just broader.
  npm: (pkg) => ({
    build: 'npm run build --workspaces --if-present',
    start: `npm start --workspace=${pkg}`,
    partialBuild: false
  }),
  // `yarn workspace <pkg> run <script>` is the one invocation valid in both classic and Berry.
  // Neither builds the member's internal dependencies first, which is worth saying out loud.
  yarn: (pkg) => ({
    build: `yarn workspace ${pkg} run build`,
    start: `yarn workspace ${pkg} start`,
    partialBuild: true
  }),
  bun: (pkg) => ({
    build: `bun run --filter ${pkg} build`,
    start: `bun run --filter ${pkg} start`,
    partialBuild: true
  })
};

export type MonorepoPackaging = {
  packaging: { type: 'nixpacks'; properties: Record<string, unknown> };
  /** A stated limitation of the emitted commands, for the gaps list. */
  caveat?: string;
};

/**
 * Root-context Nixpacks packaging for a workspace member, when the facts prove one is needed.
 *
 * Returns nothing — leaving the ordinary per-directory packaging in place — unless the service is
 * a workspace member that imports internal packages or declares it builds from the root, and the
 * package name and manager are both known. A guessed filter command is worse than a failing
 * install, because the install failure at least names the real problem.
 */
export const monorepoPackaging = (
  service: Pick<ServiceFact, 'name' | 'path' | 'workspace' | 'buildCommand' | 'startCommand'>,
  packageManager: PackageManager | undefined
): MonorepoPackaging | undefined => {
  const workspace = service.workspace;
  if (workspace === undefined || service.path === '.') return undefined;
  if (!workspace.buildsFromRoot && workspace.internalDependencies.length === 0) return undefined;

  const pkg = workspace.packageName;
  if (pkg === undefined || !SAFE_PACKAGE_NAME.test(pkg) || packageManager === undefined) return undefined;
  const commands = FILTERED_COMMANDS[packageManager]?.(pkg);
  if (commands === undefined) return undefined;

  return {
    packaging: {
      type: 'nixpacks',
      properties: {
        sourceDirectoryPath: '.',
        // Overrides are emitted only for scripts the facts prove exist. Without a `build` script the
        // root detection's own plan stands; without a `start` script there is nothing to point at.
        ...(service.buildCommand === undefined ? {} : { phases: [{ name: 'build', cmds: [commands.build] }] }),
        ...(service.startCommand === undefined ? {} : { startCmd: commands.start })
      }
    },
    ...(commands.partialBuild && service.buildCommand !== undefined
      ? {
          caveat: `${service.name} is built from the repository root so its workspace imports resolve, but the build command only builds ${pkg} itself. If packages it imports need their own build step, add them to the packaging phases.`
        }
      : {})
  };
};
