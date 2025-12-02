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
  const dirEntries = await fsExtra.readdir(fsPaths.helperLambdasDir());
  dirEntries.forEach((entry) => {
    const [name, digest] = entry.replace('.zip', '').split('-');
    const artifactPath = join(fsPaths.helperLambdasDir(), entry);
    res[name] = {
      digest,
      artifactPath,
      handler: 'index.default'
    };
  });

  return res;
};
