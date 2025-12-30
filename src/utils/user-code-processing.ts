import { isAbsolute, join } from 'node:path';
import { getFileExtension, getPathRelativeTo } from '@shared/utils/fs-utils';
import { ExpectedError, UserCodeError } from './errors';
import { getCallablePythonFunc, getJavascriptExport, getTypescriptExport, isFile } from './file-loaders';
import { tuiManager } from './tui';

export const parseUserCodeFilepath = ({
  codeType,
  fullPath,
  workingDir
}: {
  fullPath: string;
  codeType: string;
  workingDir: string;
}): { extension: LoadableFileExtensions; handler: string; filePath: string; hasExplicitHandler: boolean } => {
  let handler: string;
  let filePath: string;
  let parsedHandler: string;
  let hasExplicitHandler = true;
  const pathParts = (isAbsolute(fullPath) ? fullPath : join(workingDir, fullPath)).split(':');
  if (pathParts.length === 1) {
    filePath = pathParts[0];
  } else if (pathParts.length === 2) {
    const [first, second] = pathParts;
    if (first.includes('.') || first.length > 1) {
      filePath = first;
      parsedHandler = second;
    } else {
      filePath = [first, second].join(':');
    }
  } else {
    const [first, second, third] = pathParts;
    filePath = [first, second].join(':');
    parsedHandler = third;
  }

  filePath = isAbsolute(filePath) ? filePath : join(workingDir, filePath);

  if (!isFile(filePath)) {
    throw new ExpectedError(
      'CONFIG',
      `${codeType} at ${tuiManager.prettyFilePath(filePath)} doesn't exist or is not accessible.`,
      `The path is resolved relative to the directory specified using ${tuiManager.prettyOption(
        'currentWorkingDirectory'
      )} or the directory containing Stacktape configuration file.`
    );
  }

  const extension = getFileExtension(filePath);
  if (parsedHandler) {
    handler = parsedHandler;
  } else {
    hasExplicitHandler = false;
    handler =
      {
        js: 'default',
        ts: 'default',
        py: 'main',
        java: 'main',
        go: 'main'
      }[extension] || null;
  }

  return { handler, filePath, extension, hasExplicitHandler };
};

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
