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

export type WindowsTaskPaths = {
  task: string;
  cli: string;
  exe: string;
  projects: string;
  logs: string;
  tools: string;
};

/** Everything of a task lives in `C:\stacktape-wsl\<task>`; there is deliberately no option to move it. */
export const windowsTaskPaths = (taskId: string): WindowsTaskPaths => {
  const task = `${DEFAULT_WINDOWS_ROOT}\\${assertTaskId(taskId)}`;
  return {
    task,
    cli: `${task}\\cli`,
    exe: `${task}\\cli\\stacktape.exe`,
    projects: `${task}\\projects`,
    logs: `${task}\\logs`,
    tools: `${task}\\tools`
  };
};

/**
 * C:\stacktape-wsl and every folder from it down to `windowsPath`, which must lie inside it. The helper checks each one
 * for a junction or symbolic link before it writes or deletes below them.
 */
export const componentsFromRoot = (windowsPath: string): string[] => {
  const normalized = windowsPath.replace(/\//g, '\\').replace(/\\+$/, '');
  const root = DEFAULT_WINDOWS_ROOT.toLowerCase();
  if (normalized.toLowerCase() !== root && !normalized.toLowerCase().startsWith(`${root}\\`)) {
    throw new Error(`${windowsPath} is not inside ${DEFAULT_WINDOWS_ROOT}.`);
  }
  const parts = normalized.slice(DEFAULT_WINDOWS_ROOT.length).split('\\').filter(Boolean);
  if (parts.some((part) => part === '.' || part === '..')) {
    throw new Error(`${windowsPath} must not contain . or .. components.`);
  }
  return [
    DEFAULT_WINDOWS_ROOT,
    ...parts.map((_, index) => `${DEFAULT_WINDOWS_ROOT}\\${parts.slice(0, index + 1).join('\\')}`)
  ];
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

/**
 * WSLENV for `names`, one-way into Windows (`/w`). Inherited entries for the same names are dropped: an inherited
 * `AWS_PROFILE/u` would otherwise keep AWS_PROFILE from reaching Windows, and the CLI would use the default
 * credentials. Entries for other names are kept.
 */
export const buildWslEnv = ({ names, existing }: { names: readonly string[]; existing?: string }): string => {
  const forwarded = new Set(names);
  const kept = (existing ?? '').split(':').filter((entry) => entry && !forwarded.has(entry.split('/')[0]));
  return [...kept, ...[...forwarded].map((name) => `${name}/w`)].join(':');
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

/**
 * The PATH a Windows program should get: the current Machine and User PATH from the registry, then the entries only
 * the WSL session's copy has. Windows programs started from WSL inherit the PATH captured when WSL started, so a tool
 * installed later (Docker Desktop) is missing until `wsl --shutdown`, which would stop every other session.
 */
export const mergeWindowsPath = ({ registry, session }: { registry: string; session: string }): string => {
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const entry of [...registry.split(';'), ...session.split(';')]) {
    const trimmed = entry.trim();
    const key = trimmed.replace(/\\+$/, '').toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    entries.push(trimmed);
  }
  return entries.join(';');
};

const NAMED_KEYS: Record<string, string> = {
  enter: '\r',
  tab: '\t',
  esc: '\u001b',
  backspace: '\u007f',
  up: '\u001b[A',
  down: '\u001b[B',
  right: '\u001b[C',
  left: '\u001b[D'
};

/** Bytes a terminal sends for `keys`: named keys, `ctrl+<letter>` as its control character, anything else as text. */
export const encodeKeys = (keys: readonly string[]): string =>
  keys
    .map((key) => {
      const named = NAMED_KEYS[key.toLowerCase()];
      if (named) return named;
      const control = /^ctrl\+([a-z])$/i.exec(key);
      return control ? String.fromCharCode(control[1].toLowerCase().charCodeAt(0) - 96) : key;
    })
    .join('');

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
// OSC (title, hyperlinks), DCS, APC, PM and SOS strings, ended by BEL or ST.
const STRING_SEQUENCE = new RegExp(`${ESC}[\\]P_^X][\\s\\S]*?(?:${BEL}|${ESC}\\\\)`, 'g');
// CSI sequences: cursor movement, colors, modes, queries.
const CSI_SEQUENCE = new RegExp(`${ESC}\\[[0-?]*[ -/]*[@-~]`, 'g');
// Remaining two-character escapes, such as ESC 7 and ESC =.
const SHORT_ESCAPE = new RegExp(`${ESC}[ -~]`, 'g');

/** Pseudo console output as plain text: escape sequences removed, CRLF and lone CR turned into line breaks. */
export const stripTerminalSequences = (text: string): string =>
  text.replace(STRING_SEQUENCE, '').replace(CSI_SEQUENCE, '').replace(SHORT_ESCAPE, '').replace(/\r\n?/g, '\n');

/** A process in the task's job object, as job.ps1 lists it. */
export type WindowsProcess = { pid: number; parentPid: number; name: string; path: string | null };
