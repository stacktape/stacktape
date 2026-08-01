import type { LoadableFileExtensions } from '@utils/file-types';
import { basename, isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { VALID_CONFIG_PATHS } from '@config';
import { checkExecutableInPath } from '@utils/bin-executable';
import {
  dynamicRequire,
  getBaseName,
  getFileContent,
  getFileExtension,
  getIniFileContent,
  getRelativePath,
  isFileAccessible,
  transformToUnixPath
} from '@utils/fs-utils';
import { parseYaml } from '@utils/yaml';
import { parseDotenv } from '@utils/dotenv';
import { CliError } from '@utils/errors';
import { pythonBridge } from '@utils/python-bridge';
import fsExtra, { lstatSync, readdirSync, readFileSync } from 'fs-extra';

// Bun has native TypeScript support - no registration needed
export const activateTypescriptResolving = () => {
  // No-op: Bun's require() handles TypeScript natively
};

const formatFilePathForError = (filePath: string) => {
  const relativePath = transformToUnixPath(getRelativePath(filePath));
  const isOutsideWorkingTree =
    relativePath === '..' ||
    relativePath.startsWith('../') ||
    isAbsolute(relativePath) ||
    /^[A-Za-z]:\//.test(relativePath);
  const safePath = isOutsideWorkingTree ? basename(filePath) : relativePath;
  return safePath.startsWith('./') ? safePath : `./${safePath}`;
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
      throw new CliError({
        category: 'MISSING_PREREQUISITE',
        code: 'PYTHON_EXECUTABLE_MISSING',
        message: 'Python executable is missing.',
        hints: 'Install `python` or `python3`, or configure another executable with `stacktape defaults:configure`.'
      });
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
      const message = error instanceof Error ? error.message : String(error);
      throw new CliError({
        category: 'SOURCE_CODE',
        code: 'PYTHON_DIRECTIVE_EXECUTION_FAILED',
        message: `Python directive in \`${formatFilePathForError(filePath)}\` failed:\n${message}`,
        cause: error
      });
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
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_REFERENCED_FILE_UNAVAILABLE',
      message: `File \`${formatFilePathForError(absoluteFilePath)}\` does not exist or is not accessible.`,
      hints:
        'Relative paths are resolved from `--currentWorkingDirectory` or the directory containing the Stacktape config.'
    });
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
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_SOURCE_FILE_UNAVAILABLE',
      message: `${codeType} source \`${formatFilePathForError(filePath)}\` does not exist or is not accessible.`,
      hints:
        'Relative paths are resolved from `--currentWorkingDirectory` or the directory containing the Stacktape config.'
    });
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

const configFilePathPrecedence = [
  'stacktape.ts',
  'stacktape.yml',
  ...VALID_CONFIG_PATHS.filter((configPath) => !['stacktape.ts', 'stacktape.yml'].includes(configPath))
];

const getConfigPathPriority = (filePath: string) => {
  const configPath = basename(filePath);
  const priority = configFilePathPrecedence.indexOf(configPath);
  return priority === -1 ? Number.MAX_SAFE_INTEGER : priority;
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
    // If configPath is already absolute, use it directly
    const absoluteConfigPath = isAbsolute(configPath) ? configPath : join(dirPath, configPath);
    if (!isFileAccessible(absoluteConfigPath)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_FILE_UNAVAILABLE',
        message: `Config file \`${formatFilePathForError(absoluteConfigPath)}\` does not exist or is not accessible.`
      });
    }
    return absoluteConfigPath;
  }
  const matchingConfigPaths = getMatchingConfigFiles();
  if (matchingConfigPaths.length > 1) {
    const sortedMatchingConfigPaths = [...matchingConfigPaths].sort(
      (firstPath, secondPath) => getConfigPathPriority(firstPath) - getConfigPathPriority(secondPath)
    );
    const selectedConfigPath = sortedMatchingConfigPaths[0];

    tuiManager.warn(
      `Found multiple matching config files: ${sortedMatchingConfigPaths.join(', ')}. Using ${selectedConfigPath} based on precedence: ${configFilePathPrecedence.join(' > ')}.`
    );

    return selectedConfigPath;
  }
  return matchingConfigPaths[0];
};
