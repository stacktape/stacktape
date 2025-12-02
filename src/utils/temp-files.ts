import { globalStateManager } from '@application-services/global-state-manager';
import { fsPaths } from '@shared/naming/fs-paths';
import fsExtra from 'fs-extra';

export const deleteTempFolder = () => {
  return fsExtra.remove(
    fsPaths.absoluteTempFolderPath({
      invocationId: globalStateManager.invocationId
    })
  );
};

export const ensureTempFolder = () => {
  return fsExtra.ensureDir(
    fsPaths.absoluteTempFolderPath({
      invocationId: globalStateManager.invocationId
    })
  );
};

export const deleteBuildFolder = () => {
  return fsExtra.remove(
    fsPaths.absoluteBuildFolderPath({
      invocationId: globalStateManager.invocationId
    })
  );
};

export const saveToInitialCfTemplateFile = (contents: any) => {
  return fsExtra.outputFile(
    fsPaths.absoluteInitialCfTemplateFilePath({
      invocationId: globalStateManager.invocationId
    }),
    contents
  );
};

export const saveToCfTemplateFile = (contents: any) => {
  return fsExtra.outputFile(
    fsPaths.absoluteCfTemplateFilePath({
      invocationId: globalStateManager.invocationId
    }),
    contents
  );
};

export const saveToStpTemplateFile = (contents: any) => {
  return fsExtra.outputFile(
    fsPaths.absoluteStpTemplateFilePath({
      invocationId: globalStateManager.invocationId
    }),
    contents
  );
};

// export const ensureTemplateFiles = () => {
//   return Promise.all([
//     fsExtra.ensureFile(fsPaths.absoluteInitialCfTemplateFilePath({ invocationId: globalStateManager.invocationId })),
//     fsExtra.ensureFile(fsPaths.absoluteCfTemplateFilePath({ invocationId: globalStateManager.invocationId }))
//   ]);
// };
