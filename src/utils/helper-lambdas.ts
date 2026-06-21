import { basename, join } from 'node:path';
import { fsPaths } from '@shared/naming/fs-paths';
import { HELPER_LAMBDAS_FOLDER_NAME } from '@shared/naming/project-fs-paths';
import fsExtra from 'fs-extra';

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
  invocationId,
  invokedFrom
}: {
  invocationId?: string;
  invokedFrom: InvokedFrom;
}): Promise<HelperLambdaDetails> => {
  if (invokedFrom === 'server') {
    const dummyData = { digest: 'xxx', artifactPath: 'xxx', handler: 'index.default', size: 10 };
    return {
      batchJobTriggerLambda: dummyData,
      cdnOriginRequestLambda: dummyData,
      cdnOriginResponseLambda: dummyData,
      stacktapeServiceLambda: dummyData
    };
  }

  const helperLambdasDir = fsPaths.helperLambdasDir();
  const snapshotDir = invocationId
    ? join(fsPaths.absoluteTempFolderPath({ invocationId }), HELPER_LAMBDAS_FOLDER_NAME)
    : undefined;
  return loadHelperLambdaDetailsFromDir({
    helperLambdasDir,
    snapshotDir
  });
};
