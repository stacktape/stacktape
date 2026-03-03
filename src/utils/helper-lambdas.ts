import { join } from 'node:path';
import { fsPaths } from '@shared/naming/fs-paths';
import fsExtra from 'fs-extra';

export const loadHelperLambdaDetails = async ({
  invokedFrom
}: {
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

  const res: HelperLambdaDetails = {} as HelperLambdaDetails;
  const helperLambdasDir = fsPaths.helperLambdasDir();
  const dirEntries = await fsExtra.readdir(helperLambdasDir);
  const zipEntries = dirEntries.filter((entry) => entry.endsWith('.zip'));

  const entriesWithTime = await Promise.all(
    zipEntries.map(async (entry) => {
      const artifactPath = join(helperLambdasDir, entry);
      const stat = await fsExtra.stat(artifactPath);
      return { entry, artifactPath, mtimeMs: stat.mtimeMs };
    })
  );

  entriesWithTime
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .forEach(({ entry, artifactPath }) => {
      const [name, digest] = entry.replace('.zip', '').split('-');
      if (res[name]) {
        return;
      }
      res[name] = {
        digest,
        artifactPath,
        handler: 'index.default'
      };
    });

  return res;
};
