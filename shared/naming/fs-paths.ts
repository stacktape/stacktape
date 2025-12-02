import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CF_TEMPLATE_FILE_NAME, INITIAL_CF_TEMPLATE_FILE_NAME, IS_DEV, STP_TEMPLATE_FILE_NAME } from '@config';
import { getHomeDir } from '@shared/utils/misc';
import { existsSync } from 'fs-extra';
import { DEV_TMP_FOLDER_PATH, HELPER_LAMBDAS_FOLDER_NAME } from './project-fs-paths';

// Get the directory of the current module
// Works in both Bun compiled executables and Node.js/npm installations
const getCurrentModuleDir = () => {
  // For Bun compiled executables, use process.execPath
  if (process.isBun && process.execPath.includes('stacktape')) {
    return dirname(process.execPath);
  }

  // For ESM modules, use import.meta.url
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }

  // Fallback to __dirname (works in CommonJS/transpiled code)
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // Last resort: use process.argv[1] (the script being executed)
  return dirname(process.argv[1]);
};

export const fsPaths = {
  absoluteTempFolderPath({ invocationId }: { invocationId: string }) {
    return join(process.cwd(), '.stacktape', invocationId);
  },
  absoluteBuildFolderPath({ invocationId }: { invocationId: string }) {
    return join(fsPaths.absoluteTempFolderPath({ invocationId }), 'build');
  },
  absoluteBinDepsInstallPath({ invocationId, installationHash }: { invocationId: string; installationHash: string }) {
    return join(fsPaths.absoluteTempFolderPath({ invocationId }), 'build', '_bin-install', installationHash);
  },
  absoluteContainerArtifactFolderPath({ invocationId, jobName }: { jobName: string; invocationId: string }) {
    return `${fsPaths.absoluteBuildFolderPath({ invocationId })}/containers/${jobName}`;
  },
  absoluteLambdaArtifactFolderPath({ invocationId, jobName }: { jobName: string; invocationId: string }) {
    return `${fsPaths.absoluteBuildFolderPath({ invocationId })}/lambdas/${jobName}`;
  },
  absoluteAwsCdkConstructArtifactFolderPath({
    invocationId,
    constructName
  }: {
    constructName: string;
    invocationId: string;
  }) {
    return `${fsPaths.absoluteBuildFolderPath({ invocationId })}/constructs/${constructName}`;
  },
  absoluteNextjsBuiltProjectFolderPath({
    invocationId,
    stpResourceName
  }: {
    stpResourceName: string;
    invocationId: string;
  }) {
    return `${fsPaths.absoluteBuildFolderPath({ invocationId })}/nextjs/${stpResourceName}`;
  },
  absoluteInitialCfTemplateFilePath({ invocationId }: { invocationId: string }) {
    return join(fsPaths.absoluteTempFolderPath({ invocationId }), INITIAL_CF_TEMPLATE_FILE_NAME);
  },
  absoluteCfTemplateFilePath({ invocationId }: { invocationId: string }) {
    return join(fsPaths.absoluteTempFolderPath({ invocationId }), CF_TEMPLATE_FILE_NAME);
  },
  absoluteStpTemplateFilePath({ invocationId }: { invocationId: string }) {
    return join(fsPaths.absoluteTempFolderPath({ invocationId }), STP_TEMPLATE_FILE_NAME);
  },
  helperLambdasDir() {
    if (IS_DEV) {
      return join(DEV_TMP_FOLDER_PATH, HELPER_LAMBDAS_FOLDER_NAME);
    }

    // In production, try multiple locations to find helper-lambdas
    // This handles different installation methods: standalone executable, npm package, etc.
    const possibleLocations = [
      // 1. Next to the executable (for Bun compiled standalone binaries)
      join(dirname(process.execPath), 'helper-lambdas'),

      // 2. Next to the main script being executed (for npm installations)
      join(dirname(process.argv[1]), 'helper-lambdas'),

      // 3. Relative to the current module (when bundled with known structure)
      join(getCurrentModuleDir(), '../../helper-lambdas'),
      join(getCurrentModuleDir(), '../../../helper-lambdas'),

      // 4. In the package bin directory (for npm packages)
      join(getCurrentModuleDir(), '../../../bin/helper-lambdas')
    ];

    // Return the first location that exists

    for (const location of possibleLocations) {
      try {
        if (existsSync(location)) {
          return location;
        }
      } catch {
        // Continue to next location
      }
    }

    // Fallback to the first option if none exist (will error later with clear path)
    return possibleLocations[0];
  },
  stackInfoDirectory({ workingDir, directoryName }: { workingDir: string; directoryName: string }) {
    return join(workingDir, directoryName || '.stacktape-stack-info');
  },
  awsCredentialsFilePath() {
    return join(getHomeDir(), '.aws/credentials');
  },
  awsConfigFilePath() {
    return join(getHomeDir(), '.aws/config');
  },
  persistedStateFilePath() {
    return join(fsPaths.stacktapeDataFolder(), 'persisted-state.json');
  },
  stacktapeDataFolder() {
    return join(getHomeDir(), '.stacktape');
  },
  stackInfoCommandOutFile({ outputFileName, outputFormat }: { outputFileName: string; outputFormat: 'json' | 'yml' }) {
    return join(process.cwd(), outputFileName || `stack-info.${outputFormat}`);
  },
  pythonBridgeScriptPath() {
    const possibleLocations = [
      // 1. Next to the executable (for Bun compiled standalone binaries)
      join(dirname(process.execPath), 'bridge-files', 'python-bridge.py'),

      // 2. Next to the main script being executed (for npm installations)
      join(dirname(process.argv[1]), 'bridge-files', 'python-bridge.py'),

      // 3. Relative to the current module
      join(getCurrentModuleDir(), '../../bridge-files', 'python-bridge.py'),
      join(getCurrentModuleDir(), '../../../bridge-files', 'python-bridge.py'),

      // 4. In the package bin directory (for npm packages)
      join(getCurrentModuleDir(), '../../../bin/bridge-files', 'python-bridge.py')
    ];

    // Return the first location that exists
    // eslint-disable-next-line ts/no-require-imports
    const fs = require('node:fs');
    for (const location of possibleLocations) {
      try {
        if (fs.existsSync(location)) {
          return location;
        }
      } catch {
        // Continue to next location
      }
    }

    // Fallback to the first option
    return possibleLocations[0];
  },
  stackInfoPath({ dirPath, stackName }: { dirPath: string; stackName: string }) {
    return join(dirPath, `${stackName}.json`);
  }
};
