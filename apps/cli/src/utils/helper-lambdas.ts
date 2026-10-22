import { HELPER_LAMBDA_NAMES, type HelperLambdaName } from '@config';
import { join } from 'node:path';
import { fsPaths } from 'src/config/runtime-paths';
import { HELPER_LAMBDAS_FOLDER_NAME } from 'src/config/project-paths';
import { CliError } from '@utils/errors';
import fsExtra from 'fs-extra';

export type HelperLambdaData = {
  digest: string;
  artifactPath: string;
  handler: string;
};

export type HelperLambdaDetails = {
  [name in HelperLambdaName]: HelperLambdaData;
};

// The helper-Lambda build writes this file last. It names the ZIP of each helper that the build produced, so the CLI
// never has to guess between ZIPs from different builds left in the same directory (for example, by a Turbo cache
// restore or by a release extracted over an older install).
const HELPER_LAMBDA_MANIFEST_FILE_NAME = 'manifest.json';

export const writeHelperLambdaManifest = async ({
  helperLambdasDir,
  artifacts
}: {
  helperLambdasDir: string;
  artifacts: Partial<Record<HelperLambdaName, string>>;
}) => {
  await fsExtra.writeJson(join(helperLambdasDir, HELPER_LAMBDA_MANIFEST_FILE_NAME), artifacts, { spaces: 2 });
};

const invalidArtifactsError = (helperLambdasDir: string, problem: string, cause?: unknown) =>
  new CliError({
    category: 'CLI',
    code: 'HELPER_LAMBDA_MANIFEST_INVALID',
    message: `Stacktape cannot tell which helper Lambda artifacts in ${helperLambdasDir} to deploy: ${problem}`,
    hints: [
      'Reinstall Stacktape.',
      'When running the CLI from source, rebuild them with `pnpm --filter @stacktape/cli run build:dev-artifacts`.'
    ],
    cause
  });

const readHelperLambdaManifest = async (helperLambdasDir: string) => {
  const manifestPath = join(helperLambdasDir, HELPER_LAMBDA_MANIFEST_FILE_NAME);
  if (!(await fsExtra.pathExists(manifestPath))) {
    // Commands that never deploy a helper Lambda run with an empty directory, for example in tests.
    const zipFileNames = (await fsExtra.readdir(helperLambdasDir)).filter((entry) => entry.endsWith('.zip'));
    if (zipFileNames.length) {
      throw invalidArtifactsError(helperLambdasDir, `${HELPER_LAMBDA_MANIFEST_FILE_NAME} is missing.`);
    }
    return [];
  }
  let manifest: unknown;
  try {
    manifest = await fsExtra.readJson(manifestPath);
  } catch (error) {
    throw invalidArtifactsError(helperLambdasDir, `${HELPER_LAMBDA_MANIFEST_FILE_NAME} is not valid JSON.`, error);
  }
  const artifacts: { name: HelperLambdaName; fileName: string; digest: string }[] = [];
  for (const name of HELPER_LAMBDA_NAMES) {
    const fileName = (manifest as Record<string, unknown> | null)?.[name];
    if (fileName === undefined) {
      continue;
    }
    const digest =
      typeof fileName === 'string' ? fileName.match(new RegExp(`^${name}-([A-Za-z0-9]+)\\.zip$`))?.[1] : null;
    if (typeof fileName !== 'string' || !digest) {
      throw invalidArtifactsError(
        helperLambdasDir,
        `${HELPER_LAMBDA_MANIFEST_FILE_NAME} has an invalid entry for ${name}.`
      );
    }
    if (!(await fsExtra.pathExists(join(helperLambdasDir, fileName)))) {
      throw invalidArtifactsError(
        helperLambdasDir,
        `${fileName}, listed in ${HELPER_LAMBDA_MANIFEST_FILE_NAME}, is missing.`
      );
    }
    artifacts.push({ name, fileName, digest });
  }
  return artifacts;
};

export const loadHelperLambdaDetailsFromDir = async ({
  helperLambdasDir,
  snapshotDir
}: {
  helperLambdasDir: string;
  snapshotDir?: string;
}): Promise<HelperLambdaDetails> => {
  const artifacts = await readHelperLambdaManifest(helperLambdasDir);
  if (snapshotDir) {
    await fsExtra.ensureDir(snapshotDir);
  }

  const res = {} as HelperLambdaDetails;
  for (const { name, fileName, digest } of artifacts) {
    const artifactPath = join(helperLambdasDir, fileName);
    const stableArtifactPath = snapshotDir ? join(snapshotDir, fileName) : artifactPath;
    if (snapshotDir) {
      await fsExtra.copy(artifactPath, stableArtifactPath);
    }
    res[name] = {
      digest,
      artifactPath: stableArtifactPath,
      handler: 'index.default'
    };
  }

  return res;
};

export const loadHelperLambdaDetails = async ({
  invocationId
}: {
  invocationId?: string;
}): Promise<HelperLambdaDetails> => {
  const helperLambdasDir = fsPaths.helperLambdasDir();
  const snapshotDir = invocationId
    ? join(fsPaths.absoluteTempFolderPath({ invocationId }), HELPER_LAMBDAS_FOLDER_NAME)
    : undefined;
  return loadHelperLambdaDetailsFromDir({
    helperLambdasDir,
    snapshotDir
  });
};
