import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCliDevArtifacts, runInheritedProcess } from './child-process.ts';
import { assertConsoleDevReservation } from './console-dev-reservation.ts';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const consoleApiDirectory = join(workspaceRoot, 'apps', 'console', 'api');
const consolePackagePath = join(consoleApiDirectory, 'package.json');
const cliDirectory = join(workspaceRoot, 'apps', 'cli');
const cliDevScript = join(cliDirectory, 'scripts', 'dev.ts');

const unsupportedShellCharacter = /[;&|<>`$\r\n]/;
const pathOptions = new Set(['--configPath', '--cp', '--currentWorkingDirectory', '--cwd']);

const tokenizeLiteralCommand = (command: string): string[] => {
  const tokens: string[] = [];
  let token = '';
  let tokenStarted = false;
  let quote: 'single' | 'double' | undefined;

  const finishToken = () => {
    if (!tokenStarted) return;
    tokens.push(token);
    token = '';
    tokenStarted = false;
  };

  for (let index = 0; index < command.length; index++) {
    const character = command[index]!;

    if (quote === 'single') {
      if (character === "'") quote = undefined;
      else token += character;
      continue;
    }

    if (quote === 'double') {
      if (character === '"') {
        quote = undefined;
      } else if (character === '\\' && ['"', '\\'].includes(command[index + 1] ?? '')) {
        token += command[++index];
      } else {
        if (unsupportedShellCharacter.test(character)) {
          throw new Error('Shell interpolation is not supported in source-run Console scripts.');
        }
        token += character;
      }
      continue;
    }

    if (/\s/.test(character)) {
      finishToken();
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character === "'" ? 'single' : 'double';
      tokenStarted = true;
      continue;
    }
    if (unsupportedShellCharacter.test(character)) {
      throw new Error('Only one literal Stacktape command is supported; shell operators and interpolation are not.');
    }
    if (character === '\\' && /[\s'"\\]/.test(command[index + 1] ?? '')) {
      token += command[++index];
      tokenStarted = true;
      continue;
    }
    token += character;
    tokenStarted = true;
  }

  if (quote) throw new Error('The Console package script contains an unterminated quote.');
  finishToken();
  return tokens;
};

export const sourceCliArgsForConsoleScript = ({
  command,
  overrides = [],
  invocationDirectory = workspaceRoot,
  workingDirectory = consoleApiDirectory
}: {
  command: string;
  overrides?: string[];
  invocationDirectory?: string;
  workingDirectory?: string;
}): string[] => {
  const tokens = tokenizeLiteralCommand(command);
  if (tokens[0] !== 'stacktape') {
    throw new Error('The selected package script must start with a single `stacktape` command.');
  }
  const normalizedOverrides: string[] = [];
  let isScriptArgument = false;
  for (let index = 0; index < overrides.length; index++) {
    const argument = overrides[index]!;
    if (argument === '--') {
      isScriptArgument = true;
      normalizedOverrides.push(argument);
      continue;
    }
    if (isScriptArgument) {
      normalizedOverrides.push(argument);
      continue;
    }
    if (pathOptions.has(argument)) {
      const pathValue = overrides[++index];
      if (!pathValue || pathValue === '--') throw new Error(`Missing path after ${argument}.`);
      normalizedOverrides.push(argument, resolve(invocationDirectory, pathValue));
      continue;
    }
    const equalsOption = [...pathOptions].find((option) => argument.startsWith(`${option}=`));
    if (equalsOption) {
      const pathValue = argument.slice(equalsOption.length + 1);
      if (!pathValue) throw new Error(`Missing path after ${equalsOption}=.`);
      normalizedOverrides.push(`${equalsOption}=${resolve(invocationDirectory, pathValue)}`);
      continue;
    }
    normalizedOverrides.push(argument);
  }

  const args = [...tokens.slice(1), ...normalizedOverrides];
  const separatorIndex = args.indexOf('--');
  const cliArgs = separatorIndex === -1 ? args : args.slice(0, separatorIndex);
  const hasWorkingDirectory = cliArgs.some(
    (arg) =>
      arg === '--currentWorkingDirectory' ||
      arg === '--cwd' ||
      arg.startsWith('--currentWorkingDirectory=') ||
      arg.startsWith('--cwd=')
  );
  if (hasWorkingDirectory) return args;
  if (separatorIndex === -1) return [...args, '--currentWorkingDirectory', workingDirectory];
  return [
    ...args.slice(0, separatorIndex),
    '--currentWorkingDirectory',
    workingDirectory,
    ...args.slice(separatorIndex)
  ];
};

const loadConsoleScripts = async (): Promise<Record<string, string>> => {
  const packageJson = JSON.parse(await readFile(consolePackagePath, 'utf8')) as {
    scripts?: Record<string, string>;
  };
  return packageJson.scripts ?? {};
};

const printUsage = (scriptNames: string[]) => {
  console.info('Usage: pnpm dev:console:cli <package-script> [Stacktape overrides]');
  console.info('Example: pnpm dev:console:cli deploy:dev --ui stream');
  console.info(`Available Stacktape scripts: ${scriptNames.join(', ')}`);
};

const main = async () => {
  if (!process.versions.bun) {
    throw new Error('This helper must be run through Bun. Use `pnpm dev:console:cli ...`.');
  }

  const scripts = await loadConsoleScripts();
  const stacktapeScripts = Object.entries(scripts)
    .filter(([, command]) => command.trimStart().startsWith('stacktape '))
    .map(([name]) => name)
    .toSorted();
  const [scriptName, ...overrides] = process.argv.slice(2);
  if (!scriptName) {
    printUsage(stacktapeScripts);
    process.exitCode = 1;
    return;
  }

  const command = scripts[scriptName];
  if (!command) {
    throw new Error(`Console API package script \`${scriptName}\` does not exist.`);
  }
  const cliArgs = sourceCliArgsForConsoleScript({
    command,
    overrides,
    invocationDirectory: process.env.INIT_CWD || process.cwd()
  });

  // Shared dev scripts include deploy, UI sync, migrations and devlocal support refreshes.
  // Keep these aliases under the same reservation as the canonical root commands.
  if (scriptName.split(':').some((part) => part === 'dev' || part === 'devlocal') || scriptName === 'dev:lambda') {
    await assertConsoleDevReservation();
  }

  console.info(`Running Console script \`${scriptName}\` with the source-built Stacktape CLI.\n`);
  const buildExitCode = await buildCliDevArtifacts(workspaceRoot);
  if (buildExitCode !== 0) {
    process.exitCode = buildExitCode;
    return;
  }

  process.exitCode = await runInheritedProcess(process.execPath, [cliDevScript, ...cliArgs], cliDirectory);
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
