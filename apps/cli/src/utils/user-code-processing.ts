import { tuiManager } from '@application-services/tui-manager';
import { getPathRelativeTo } from '@utils/fs-utils';
import { ExpectedError, UserCodeError } from './errors';
import { getCallablePythonFunc, getJavascriptExport, getTypescriptExport, parseUserCodeFilepath } from './file-loaders';

export const getUserCodeAsFn = ({
  filePath: rawFilePath,
  cache,
  codeType,
  workingDir
}: {
  filePath: string;
  cache: boolean;
  codeType: 'DIRECTIVE' | 'HOOK' | 'WORKLOAD' | string;
  workingDir: string;
}) => {
  let functionToExecute;
  const { filePath, handler, extension } = parseUserCodeFilepath({ fullPath: rawFilePath, codeType, workingDir });
  const userPrintableFilePath = getPathRelativeTo(filePath, process.cwd());

  try {
    if (extension === 'js') {
      functionToExecute = getJavascriptExport({
        filePath,
        cache: cache || false,
        exportName: handler
      });
    }
    if (extension === 'ts') {
      functionToExecute = getTypescriptExport({
        filePath,
        cache: cache || false,
        exportName: handler
      });
    }
    if (extension === 'py') {
      functionToExecute = getCallablePythonFunc(filePath, handler);
    }
  } catch (err) {
    throw new UserCodeError(`Failed to load ${codeType} at ${userPrintableFilePath}`, err);
  }

  if (typeof functionToExecute !== 'function') {
    throw new ExpectedError(
      'SOURCE_CODE',
      `${codeType} at ${userPrintableFilePath} doesn't export function with name '${handler}'.`,
      'If you want to use another handler, adjust it in configuration using {filePath}:{handler} syntax.'
    );
  }

  return async function processUserCode(...params) {
    try {
      const res = await functionToExecute(...params);
      return res;
    } catch (err) {
      throw new UserCodeError(
        `Failed to process ${tuiManager.makeBold(codeType)} at ${tuiManager.prettyFilePath(userPrintableFilePath)}`,
        err
      );
    }
  };
};
