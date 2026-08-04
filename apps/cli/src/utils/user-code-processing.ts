import { getPathRelativeTo } from '@utils/fs-utils';
import { CliError, UserCodeError } from './errors';
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
    if (err instanceof CliError) throw err;
    throw new UserCodeError(`Failed to load ${codeType} at ${userPrintableFilePath}`, err);
  }

  if (typeof functionToExecute !== 'function') {
    throw new CliError({
      category: 'SOURCE_CODE',
      code: 'SOURCE_CODE_HANDLER_MISSING',
      message: `${codeType} at \`${userPrintableFilePath}\` does not export a function named \`${handler}\`.`,
      hints: 'To use another handler, configure the source as `<filePath>:<handler>`.'
    });
  }

  return async function processUserCode(...params) {
    try {
      const res = await functionToExecute(...params);
      return res;
    } catch (err) {
      if (err instanceof CliError) throw err;
      throw new UserCodeError(`Failed to process ${codeType} at \`${userPrintableFilePath}\``, err);
    }
  };
};
