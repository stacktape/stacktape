import { globalStateManager } from '@application-services/global-state-manager';
import { fsPaths } from 'src/config/runtime-paths';
import fsExtra from 'fs-extra';

export const deleteTempFolder = () => {
  return fsExtra.remove(
    fsPaths.absoluteTempFolderPath({
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
