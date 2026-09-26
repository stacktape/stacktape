/**
 * A release no longer bundles pack, nixpacks or the Session Manager plugin (Windows keeps the plugin, whose AWS
 * download is an installer). This check resolves each tool as a customer's first command would, through the CLI's own
 * resolver (`src/utils/external-tools.ts`), and runs its version command on the target:
 *
 *   bun scripts/release/verify-external-tools.ts [--tools-dir <dir>] [--platform <platform>] [--no-run] [--offline]
 *     [--bundled-session-manager-plugin <path>]
 *
 * - Without `--tools-dir` it resolves into a new temporary directory, so first use downloads from upstream.
 * - `--platform` resolves another platform's assets, for example to preseed an Alpine container from its host;
 *   `--no-run` then skips running them.
 * - `--offline` fails instead of downloading: every tool must already be at the resolver's path (a preseeded image).
 *
 * The release workflow's Alpine smoke runs a bundle of this file with the candidate's own Bun (`BUN_BE_BUN=1`).
 */
import type { ExternalTool } from 'src/utils/external-tools';
import type { SupportedPlatform } from '@utils/platform';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatform } from '@utils/bin-executable';
import { EXTERNAL_TOOL_MANIFEST, externalToolPath, resolveExternalTool } from 'src/utils/external-tools';

const VERSION_ARGUMENTS: Record<ExternalTool, string[]> = {
  pack: ['version'],
  nixpacks: ['--version'],
  'session-manager-plugin': ['--version']
};

export type ExternalToolCheck = {
  tool: ExternalTool;
  version: string;
  path: string;
  downloaded: boolean;
  output: string | null;
};

export const verifyExternalTools = async ({
  platform = getPlatform(),
  toolsDirectory,
  execute = true,
  offline = false,
  bundledSessionManagerPlugin
}: {
  platform?: SupportedPlatform;
  toolsDirectory: string;
  execute?: boolean;
  offline?: boolean;
  /** The plugin inside a Windows archive; the one tool the resolver does not download. */
  bundledSessionManagerPlugin?: string;
}): Promise<ExternalToolCheck[]> => {
  const checks: ExternalToolCheck[] = [];
  for (const tool of Object.keys(EXTERNAL_TOOL_MANIFEST) as ExternalTool[]) {
    const { version, assets } = EXTERNAL_TOOL_MANIFEST[tool];
    let downloaded = false;
    let path: string;
    if (assets[platform]) {
      path = await resolveExternalTool({
        tool,
        platform,
        toolsDirectory,
        onDownloadStart: () => {
          if (offline) {
            throw new Error(`${tool} was not preseeded at ${externalToolPath({ tool, platform, toolsDirectory })}.`);
          }
          downloaded = true;
        }
      });
    } else if (bundledSessionManagerPlugin && tool === 'session-manager-plugin') {
      path = bundledSessionManagerPlugin;
    } else {
      throw new Error(`${tool} ${version} has no download for ${platform} and no bundled copy was given.`);
    }
    let output: string | null = null;
    if (execute) {
      const run = Bun.spawnSync({ cmd: [path, ...VERSION_ARGUMENTS[tool]], stdout: 'pipe', stderr: 'pipe' });
      output = `${run.stdout.toString()}${run.stderr.toString()}`.trim();
      if (run.exitCode !== 0 || !output.includes(version)) {
        throw new Error(
          `${tool} at ${path} exited with ${run.exitCode} and printed "${output}", not version ${version}.`
        );
      }
    }
    checks.push({ tool, version, path, downloaded, output });
  }
  return checks;
};

const main = async () => {
  const argument = (name: string) => {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : undefined;
  };
  const toolsDirectory = argument('tools-dir') ?? (await mkdtemp(join(tmpdir(), 'stacktape-external-tools-')));
  const checks = await verifyExternalTools({
    platform: (argument('platform') as SupportedPlatform | undefined) ?? getPlatform(),
    toolsDirectory,
    execute: !process.argv.includes('--no-run'),
    offline: process.argv.includes('--offline'),
    bundledSessionManagerPlugin: argument('bundled-session-manager-plugin')
  });
  console.info(JSON.stringify({ toolsDirectory, checks }, null, 2));
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
