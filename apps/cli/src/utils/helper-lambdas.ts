import type { HelperLambdaName } from '@config';
import { basename, join } from 'node:path';
import { fsPaths } from 'src/config/runtime-paths';
import { HELPER_LAMBDAS_FOLDER_NAME } from 'src/config/project-paths';
import fsExtra from 'fs-extra';

export type HelperLambdaData = {
  digest: string;
  artifactPath: string;
  handler: string;
  size: number;
};

export type HelperLambdaDetails = {
  [name in HelperLambdaName]: HelperLambdaData;
};

export const loadHelperLambdaDetailsFromDir = async ({
  helperLambdasDir,
  snapshotDir
}: {
  helperLambdasDir: string;
  snapshotDir?: string;
}): Promise<HelperLambdaDetails> => {
  const res: HelperLambdaDetails = {} as HelperLambdaDetails;
  const dirEntries = await fsExtra.readdir(helperLambdasDir);
  const zipEntries = dirEntries.filter((entry) => entry.endsWith('.zip'));

  const entriesWithTime = await Promise.all(
    zipEntries.map(async (entry) => {
      const artifactPath = join(helperLambdasDir, entry);
      const stat = await fsExtra.stat(artifactPath);
      return { entry, artifactPath, mtimeMs: stat.mtimeMs };
    })
  );

  if (snapshotDir) {
    await fsExtra.ensureDir(snapshotDir);
  }

  for (const { entry, artifactPath } of entriesWithTime.sort((a, b) => b.mtimeMs - a.mtimeMs)) {
    const [name, digest] = entry.replace('.zip', '').split('-');
    if (res[name]) {
      continue;
    }
    const stableArtifactPath = snapshotDir ? join(snapshotDir, basename(artifactPath)) : artifactPath;
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
