import { basename, isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { VALID_CONFIG_PATHS } from '@config';
import { stpErrors } from '@errors';
import { checkExecutableInPath } from '@shared/utils/bin-executable';
import {
  dynamicRequire,
  getBaseName,
  getFileContent,
  getIniFileContent,
  isFileAccessible
} from '@shared/utils/fs-utils';
import { parseYaml } from '@shared/utils/yaml';
import { parseDotenv } from '@utils/dotenv';
import { ExpectedError } from '@utils/errors';
import { pythonBridge } from '@utils/python-bridge';
import fsExtra, { lstatSync, readdirSync, readFileSync } from 'fs-extra';
import { parseUserCodeFilepath } from './user-code-processing';

// Bun has native TypeScript support - no registration needed
export const activateTypescriptResolving = () => {
  // No-op: Bun's require() handles TypeScript natively
};

export const getTypescriptExport = ({
  cache,
  filePath,
  exportName
}: {
  filePath: string;
  cache: boolean;
  exportName: string | 'default';
}) => {
  // Bun's require() handles TypeScript natively
  const importedValue = dynamicRequire({ filePath, cache });
  return importedValue[exportName || 'default'];
};

export const loadFromTypescript = ({ filePath, exportName }: { filePath: string; exportName: string }) => {
  // @note return promise for consistency with other loaders
  return Promise.resolve(getTypescriptExport({ filePath, cache: true, exportName }));
};

let pythonExecutable: string;
export const getPythonExecutable = () => {
  if (pythonExecutable) {
    return pythonExecutable;
  }
  pythonExecutable = globalStateManager.persistedState?.otherDefaults?.executablePython;
  if (!pythonExecutable) {
    const isPythonExecInPath = checkExecutableInPath('python');
    const isPython3ExecInPath = checkExecutableInPath('python3');
    if (!isPythonExecInPath && !isPython3ExecInPath) {
      throw new ExpectedError(
        'MISSING_PREREQUISITE',
        'Python executable is missing.',
        "It should be either 'python' or 'python3'. If you use different python executable, you can configure it globally for your system using 'stacktape configureDefaults' command."
      );
    }
    pythonExecutable = isPythonExecInPath ? 'python' : 'python3';
  }
  return pythonExecutable;
};

let python;

export const killPythonBridge = () => {
  if (python) {
    python.kill();
  }
};

export const getCallablePythonFunc = (filePath: string, functionName = 'main') => {
  if (!python) {
    python = pythonBridge({ pythonExecutable: getPythonExecutable() });
  }
  const userFileCache = {};
  if (!userFileCache[filePath]) {
    userFileCache[filePath] = readFileSync(filePath, { encoding: 'utf8' });
  }
  return async function (...params: any[]): Promise<any> {
    try {
      await python.ex`exec(${userFileCache[filePath]});`;
      const functionParams = params.map((param) => (typeof param === 'string' ? `'${param}'` : param)).join(',');

      const getResultCode = `${functionName}(${functionParams})`;
      const res = await python`eval(${getResultCode})`;

      return res;
    } catch (error) {
      throw new ExpectedError('SOURCE_CODE', `Error from python directive in file ${filePath}:\n${error.message}`);
    }
  };
};

export const loadFromPython = async (filePath: string, handler: string) => {
  return getCallablePythonFunc(filePath, handler)();
};

export const loadFromJson = (filePath: string) => {
  return fsExtra.readJson(filePath);
};

export const getJavascriptExport = ({
  cache,
  filePath,
  exportName
}: {
  filePath: string;
  cache: boolean;
  exportName?: string;
}) => {
  const importedValue = dynamicRequire({ filePath, cache });
  return exportName ? importedValue[exportName] : importedValue;
};

export const loadFromJavascript = ({ filePath, exportName }: { filePath: string; exportName: string }) => {
  // @note return promise for consistency with other loaders
  return Promise.resolve(getJavascriptExport({ filePath, cache: true, exportName }));
};

export const loadFromIni = getIniFileContent;

export const loadFromDotenv = async (filePath: string) => {
  const fileContent = await getFileContent(filePath);

  return parseDotenv(fileContent);
};

export const loadFromYaml = async (filePath: string) => {
  const fileContent = await getFileContent(filePath);
  return parseYaml(fileContent);
};

export const loadFromAnySupportedFile = async ({
  workingDir,
  codeType,
  sourcePath
}: {
  sourcePath: string;
  codeType: string;
  workingDir: string;
}) => {
  const { filePath, handler, extension } = parseUserCodeFilepath({
    fullPath: sourcePath,
    codeType,
    workingDir
  });

  if (getBaseName(filePath).startsWith('.env')) {
    return loadFromDotenv(filePath);
  }
  if (extension === 'yaml' || extension === 'yml') {
    return loadFromYaml(filePath);
  }
  if (extension === 'json') {
    return loadFromJson(filePath);
  }
  if (extension === 'ini') {
    return loadFromIni(filePath);
  }
  if (extension === 'js') {
    return loadFromJavascript({ filePath, exportName: handler });
  }
  if (extension === 'ts') {
    return loadFromTypescript({ filePath, exportName: handler });
  }

  if (extension === 'py') {
    return loadFromPython(filePath, handler);
  }

  return null;
};

export const loadRawFileContent = async ({ workingDir, filePath }: { filePath: string; workingDir: string }) => {
  const absoluteFilePath = isAbsolute(filePath) ? filePath : join(workingDir, filePath);
  if (!isFile(absoluteFilePath)) {
    throw new ExpectedError(
      'CONFIG',
      `File at ${tuiManager.prettyFilePath(filePath)} doesn't exist or is not accessible.`,
      `The path is resolved relative to the directory specified using ${tuiManager.prettyOption(
        'currentWorkingDirectory'
      )} or the directory containing Stacktape configuration file.`
    );
  }
  return getFileContent(absoluteFilePath);
};

export const isFile = (filePath: string) => {
  try {
    return lstatSync(filePath).isFile();
  } catch {
    return false;
  }
};

const getMatchingConfigFiles = () => {
  const { currentWorkingDirectory } = globalStateManager.args;
  const dirPath = currentWorkingDirectory || process.cwd();
  const directoryContents = readdirSync(dirPath);
  return directoryContents
    .map((item) => join(dirPath, item))
    .filter((item) => {
      return lstatSync(item).isFile() && VALID_CONFIG_PATHS.includes(basename(item));
    });
};

export const getIsConfigPotentiallyUsable = () => {
  return Boolean(globalStateManager.args.configPath || getMatchingConfigFiles().length);
};

export const getConfigPath = (): string => {
  const { configPath, currentWorkingDirectory } = globalStateManager.args;
  const dirPath = currentWorkingDirectory || process.cwd();
  if (configPath) {
    const absoluteConfigPath = join(dirPath, configPath);
    if (!isFileAccessible(absoluteConfigPath)) {
      throw stpErrors.e14({ configPath: absoluteConfigPath });
    }
    return absoluteConfigPath;
  }
  const matchingConfigPaths = getMatchingConfigFiles();
  if (matchingConfigPaths.length > 1) {
    throw stpErrors.e15({ matchingConfigPaths });
  }
  // if (matchingConfigPaths.length === 0) {
  //   throw stpErrors.e16({});
  // }
  return matchingConfigPaths[0];
};
