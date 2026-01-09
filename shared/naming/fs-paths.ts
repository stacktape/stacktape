import { dirname, join } from 'node:path';
import { CF_TEMPLATE_FILE_NAME, INITIAL_CF_TEMPLATE_FILE_NAME, IS_DEV, STP_TEMPLATE_FILE_NAME } from '@config';
import { getPlatform } from '@shared/utils/bin-executable';
import {
  NIXPACKS_BINARY_FILE_NAMES,
  PACK_BINARY_FILE_NAMES,
  SESSION_MANAGER_PLUGIN_BINARY_FILE_NAMES
} from '@shared/utils/constants';
import { getHomeDir } from '@shared/utils/misc';
import {
  BRIDGE_FILES_FOLDER_NAME,
  DEV_TMP_FOLDER_PATH,
  HELPER_LAMBDAS_FOLDER_NAME,
  SCRIPTS_ASSETS_PATH,
  STARTER_PROJECTS_METADATA_FOLDER_NAME
} from './project-fs-paths';

export const fsPaths = {
  absoluteExecutableDirname() {
    // this can be either in node_modules, or in user's home directory
    // for development mode, it's in the project root
    return dirname(process.execPath);
  },
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
  absoluteSharedLayerFolderPath({ invocationId }: { invocationId: string }) {
    return `${fsPaths.absoluteBuildFolderPath({ invocationId })}/shared-layer`;
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
    return join(fsPaths.absoluteExecutableDirname(), HELPER_LAMBDAS_FOLDER_NAME);
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
    return join(fsPaths.absoluteExecutableDirname(), BRIDGE_FILES_FOLDER_NAME, 'python-bridge.py');
  },
  stackInfoPath({ dirPath, stackName }: { dirPath: string; stackName: string }) {
    return join(dirPath, `${stackName}.json`);
  },
  startersMetadataFilePath() {
    return IS_DEV
      ? join(process.cwd(), STARTER_PROJECTS_METADATA_FOLDER_NAME)
      : join(fsPaths.absoluteExecutableDirname(), STARTER_PROJECTS_METADATA_FOLDER_NAME);
  },
  sessionManagerPath() {
    return IS_DEV
      ? join(SCRIPTS_ASSETS_PATH, 'session-manager-plugin', SESSION_MANAGER_PLUGIN_BINARY_FILE_NAMES[getPlatform()])
      : join(
          fsPaths.absoluteExecutableDirname(),
          'session-manager-plugin',
          getPlatform() === 'win' ? 'smp.exe' : 'smp'
        );
  },
  packPath() {
    return IS_DEV
      ? join(SCRIPTS_ASSETS_PATH, 'pack', PACK_BINARY_FILE_NAMES[getPlatform()])
      : join(fsPaths.absoluteExecutableDirname(), 'pack', getPlatform() === 'win' ? 'pack.exe' : 'pack');
  },
  esbuildRegisterPath() {
    return IS_DEV
      ? join(process.cwd(), 'node_modules', 'esbuild-register', 'register')
      : join(fsPaths.absoluteExecutableDirname(), 'esbuild', 'esbuild-register.js');
  },
  esbuildBinaryPath() {
    return IS_DEV
      ? null // development mode uses node_modules esbuild
      : join(fsPaths.absoluteExecutableDirname(), 'esbuild', getPlatform() === 'win' ? 'exec.exe' : 'exec');
  },
  nixpacksPath() {
    return IS_DEV
      ? join(SCRIPTS_ASSETS_PATH, 'nixpacks', NIXPACKS_BINARY_FILE_NAMES[getPlatform()])
      : join(fsPaths.absoluteExecutableDirname(), 'nixpacks', getPlatform() === 'win' ? 'nixpacks.exe' : 'nixpacks');
  }
};
