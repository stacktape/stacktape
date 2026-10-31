// Pure rules for running the CLI on the Windows host from WSL. `windows-host.ts` does the I/O; procedure in
// docs/testing/windows-from-wsl.md.

/** Every task owns `<root>\<taskId>`; the default root has no parent `package.json` or Git repository. */
export const DEFAULT_WINDOWS_ROOT = 'C:\\stacktape-wsl';

const TASK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

export const assertTaskId = (taskId: string | undefined): string => {
  if (!taskId || !TASK_ID_PATTERN.test(taskId)) {
    throw new Error(
      `Pass --task <id>: 1-32 lowercase letters, digits or hyphens (got ${JSON.stringify(taskId ?? '')}).`
    );
  }
  return taskId;
};

const DRIVE_ROOT_PATTERN = /^[A-Za-z]:\\$/;

export const assertWindowsRoot = (root: string): string => {
  const normalized = root.replace(/\//g, '\\').replace(/\\+$/, '');
  if (!/^[A-Za-z]:\\[^\\]/.test(normalized) || DRIVE_ROOT_PATTERN.test(`${normalized}\\`)) {
    throw new Error(
      `The Windows root must be an absolute folder below a drive root, like C:\\stacktape-wsl (got ${root}).`
    );
  }
  return normalized;
};

export type WindowsTaskPaths = {
  task: string;
  cli: string;
  exe: string;
  projects: string;
  logs: string;
  tools: string;
};

export const windowsTaskPaths = ({ root, taskId }: { root: string; taskId: string }): WindowsTaskPaths => {
  const task = `${assertWindowsRoot(root)}\\${assertTaskId(taskId)}`;
  return {
    task,
    cli: `${task}\\cli`,
    exe: `${task}\\cli\\stacktape.exe`,
    projects: `${task}\\projects`,
    logs: `${task}\\logs`,
    tools: `${task}\\tools`
  };
};

/** `C:\a\b` -> `/mnt/c/a/b`. Only drive paths: UNC paths have no fixed WSL mount. */
export const toWslPath = (windowsPath: string): string => {
  const match = /^([A-Za-z]):(?:[\\/](.*))?$/.exec(windowsPath);
  if (!match) {
    throw new Error(`Not an absolute Windows drive path: ${windowsPath}`);
  }
  const rest = (match[2] ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
  return `/mnt/${match[1].toLowerCase()}${rest ? `/${rest}` : ''}`;
};

/**
 * `/mnt/c/a` -> `C:\a`; any other absolute Linux path -> `\\wsl.localhost\<distro>\...`. Windows programs work in
 * the first; the second is a network share where cmd.exe refuses to start and Linux symlinks cannot be followed.
 */
export const toWindowsPath = (linuxPath: string, distro?: string): string => {
  if (!linuxPath.startsWith('/')) {
    throw new Error(`Not an absolute Linux path: ${linuxPath}`);
  }
  const drive = /^\/mnt\/([a-z])(?:\/(.*))?$/.exec(linuxPath);
  if (drive) {
    const rest = (drive[2] ?? '').replace(/\/+$/, '').replace(/\//g, '\\');
    return `${drive[1].toUpperCase()}:\\${rest}`;
  }
  if (!distro) {
    throw new Error(`${linuxPath} is inside WSL; pass the distribution name to address it from Windows.`);
  }
  return `\\\\wsl.localhost\\${distro}${linuxPath.replace(/\/+$/, '').replace(/\//g, '\\')}`;
};

/**
 * Quotes one argument so `CommandLineToArgvW` and the C runtime parse it back unchanged (the rules in
 * https://learn.microsoft.com/cpp/c-language/parsing-c-command-line-arguments). Backslashes are literal unless they
 * precede a quote; those, and a trailing run before the closing quote, are doubled.
 */
export const quoteWindowsArgument = (argument: string): string => {
  if (argument !== '' && !/[\s"]/.test(argument)) {
    return argument;
  }
  let quoted = '"';
  let backslashes = 0;
  for (const character of argument) {
    if (character === '\\') {
      backslashes++;
      continue;
    }
    if (character === '"') {
      quoted += `${'\\'.repeat(backslashes * 2 + 1)}"`;
    } else {
      quoted += `${'\\'.repeat(backslashes)}${character}`;
    }
    backslashes = 0;
  }
  return `${quoted}${'\\'.repeat(backslashes * 2)}"`;
};

export const buildWindowsCommandLine = (program: string, args: readonly string[]): string =>
  [program, ...args].map(quoteWindowsArgument).join(' ');

/** PowerShell single-quoted string literal. */
export const quotePowerShellString = (value: string): string => `'${value.replace(/'/g, "''")}'`;

// Variables WSL must never hand to a Windows process: Linux paths and WSL's own Docker daemon would point the
// Windows CLI at the wrong tools, and STP_DEV_MODE makes a compiled CLI look for source-checkout artifacts.
const BLOCKED_ENVIRONMENT_NAME = /^(PATH|HOME|PWD|SHELL|TMPDIR|DOCKER_.*|STP_DEV_MODE|WSLENV|WSL_.*)$/;
const DEFAULT_PASS_THROUGH = ['AWS_PROFILE', 'AWS_REGION', 'AWS_DEFAULT_REGION'];

/**
 * Names (never values) of the variables passed to Windows: the AWS profile and region, every `STACKTAPE_*` variable
 * set here, and explicitly requested names.
 */
export const selectPassThroughNames = ({
  environment,
  extraNames = []
}: {
  environment: Record<string, string | undefined>;
  extraNames?: readonly string[];
}): string[] => {
  for (const name of extraNames) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Invalid environment variable name: ${name}`);
    }
    if (BLOCKED_ENVIRONMENT_NAME.test(name)) {
      throw new Error(`${name} describes the WSL side and must not be passed to Windows.`);
    }
  }
  const candidates = [
    ...DEFAULT_PASS_THROUGH,
    ...Object.keys(environment).filter((name) => name.startsWith('STACKTAPE_')),
    ...extraNames
  ];
  return [...new Set(candidates)].filter((name) => environment[name] !== undefined).sort();
};

/** WSLENV entries for `names`, one-way into Windows (`/w`), keeping entries already present. */
export const buildWslEnv = ({ names, existing }: { names: readonly string[]; existing?: string }): string => {
  const entries = (existing ?? '').split(':').filter(Boolean);
  const present = new Set(entries.map((entry) => entry.split('/')[0]));
  return [...entries, ...names.filter((name) => !present.has(name)).map((name) => `${name}/w`)].join(':');
};

/** Refuses to run without an allowed profile, so the Windows CLI never falls back to the default credentials. */
export const assertAwsProfile = (environment: Record<string, string | undefined>, allowedProfiles: string[]) => {
  const profile = environment.AWS_PROFILE;
  if (!profile) {
    throw new Error('Set AWS_PROFILE (for example stacktape-e2e); the Windows CLI must not use the default profile.');
  }
  if (!allowedProfiles.includes(profile)) {
    throw new Error(
      `AWS_PROFILE=${profile} is not allowed for Windows-host runs (allowed: ${allowedProfiles.join(', ')}). ` +
        'Add it with --allow-profile only for a disposable account.'
    );
  }
  return profile;
};

/** Paths the fixture copy leaves out: Linux-built dependencies and caches that Windows must create itself. */
export const DEFAULT_STAGE_EXCLUDES = ['node_modules', '.venv', '__pycache__', '.stacktape-stack-info'];
