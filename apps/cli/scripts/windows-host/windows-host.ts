// Builds the CLI from this checkout for Windows and runs it as a native Windows process on the WSL host.
// Procedure, pitfalls and cleanup: docs/testing/windows-from-wsl.md. Run from apps/cli:
//   bun scripts/windows-host/windows-host.ts <command> --task <id> [options] [-- <stacktape arguments>]
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { spawn } from 'node:child_process';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, rmdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DEFAULT_STAGE_EXCLUDES,
  DEFAULT_WINDOWS_ROOT,
  assertAwsProfile,
  assertTaskId,
  buildWindowsCommandLine,
  buildWslEnv,
  componentsFromRoot,
  encodeKeys,
  mergeWindowsPath,
  selectPassThroughNames,
  stripTerminalSequences,
  type WindowsProcess,
  toWindowsPath,
  toWslPath,
  windowsTaskPaths
} from './core';

const CMD = '/mnt/c/Windows/System32/cmd.exe';
const PWSH = '/mnt/c/Program Files/PowerShell/7/pwsh.exe';
const ALLOWED_PROFILES = ['stacktape-e2e'];
const LINUX_BUILD_ROOT = '/tmp/stacktape-windows-host';
// Windows programs started from a Linux directory get a `\\wsl.localhost` working directory, which cmd.exe rejects.
const WINDOWS_CWD = '/mnt/c';

const USAGE = `Usage: bun scripts/windows-host/windows-host.ts <command> --task <id> [options] [-- args]

Commands:
  doctor                      Check Windows tools, AWS profile, Docker and the task folder.
  build [--bytecode]          Build stacktape.exe and its assets from this checkout into <task>\\cli.
  stage <dir> [--name n]      Copy a project to <task>\\projects\\<name> (no node_modules, symlinks followed).
  run [--cwd p] -- args       Run stacktape.exe with piped output; exits with its exit code.
  exec [--cwd p] -- cmd args  Run a Windows command through cmd.exe (for example npm install).
  console [--cwd p] [--detach] [--window] [--program C:\\path\\x.exe] -- args
                              Run stacktape.exe in a terminal: a hidden pseudo console (ConPTY) by default; with
                              --window, a real console window on a separate desktop that never shows on screen.
  wait [--timeout s]          Wait for the console program to exit; exits with its exit code.
  screen [--pid n] [--lines n]
                              Print the text of the program's console.
  output [--lines n]          Print the end of the pseudo console's output, without escape sequences.
  keys -- <key>...            Type into the pseudo console: text, enter, tab, esc, ctrl+<letter>.
  ctrl-c [--pid n] [--break]  Press Ctrl+C (or Ctrl+Break) in the program's console.
  close [--pid n]             Close a --window console, like clicking its X.
  ps                          List the processes in the task's job object (everything the helper started).
  kill                        Terminate the job and verify it is empty.
  cleanup                     kill, then delete the task folder and the Linux build folder, and verify.

Everything lives in ${DEFAULT_WINDOWS_ROOT}\\<task>. Options: --env NAME (repeatable),
--allow-profile NAME, --version <v> (build), --control-plane dev|user (default dev: the dev Console with the WSL
dev login; user: the Windows profile's own login).`;

type Options = {
  task: string;
  cwd?: string;
  name?: string;
  env: string[];
  exclude: string[];
  allowProfile: string[];
  pid?: number;
  lines: number;
  timeout: number;
  bytecode: boolean;
  break: boolean;
  detach: boolean;
  window: boolean;
  program?: string;
  version: string;
  includeNodeModules: boolean;
  controlPlane: 'dev' | 'user';
};

const log = (message: string) => process.stderr.write(`windows-host: ${message}\n`);

const fail = (message: string): never => {
  log(message);
  process.exit(2);
};

const waitForExit = (child: ChildProcess) =>
  new Promise<number>((resolvePromise, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolvePromise(code ?? (signal ? 128 : 1)));
  });

const run = async (command: string, args: string[], options: SpawnOptions = {}) => {
  const child = spawn(command, args, { cwd: WINDOWS_CWD, stdio: 'inherit', ...options });
  return waitForExit(child);
};

const capture = async (command: string, args: string[], options: SpawnOptions = {}) => {
  const child = spawn(command, args, { cwd: WINDOWS_CWD, stdio: ['ignore', 'pipe', 'pipe'], ...options });
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => (stdout += chunk));
  child.stderr?.on('data', (chunk) => (stderr += chunk));
  const code = await waitForExit(child);
  return { code, stdout: stdout.replace(/\r\n/g, '\n'), stderr: stderr.replace(/\r\n/g, '\n') };
};

const paths = (options: Options) => windowsTaskPaths(options.task);

/**
 * Creates `windowsPath` (inside the task folder) after checking that neither C:\\stacktape-wsl nor any existing
 * component down to it is a junction or symbolic link, so code under test cannot redirect the helper's writes.
 * WSL shows Windows junctions as symbolic links.
 */
const ensureSafeDirectory = async (windowsPath: string) => {
  for (const component of componentsFromRoot(windowsPath)) {
    const linuxPath = toWslPath(component);
    if (existsSync(linuxPath) && lstatSync(linuxPath).isSymbolicLink()) {
      throw new Error(`${component} is a link; refusing to write below it.`);
    }
  }
  await mkdir(toWslPath(windowsPath), { recursive: true });
  return toWslPath(windowsPath);
};

/** Copies the PowerShell helpers next to the task, so Windows runs them from a drive path. */
const installTools = async (options: Options) => {
  const target = await ensureSafeDirectory(paths(options).tools);
  for (const file of readdirSync(import.meta.dir).filter((entry) => /\.(ps1|cs)$/.test(entry))) {
    await copyFile(join(import.meta.dir, file), join(target, file));
  }
};

const pwshArgs = (options: Options, script: string, args: string[]) => [
  '-NoProfile',
  '-NonInteractive',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  `${paths(options).tools}\\${script}`,
  ...args
];

const runPwsh = async (options: Options, script: string, args: string[]) => {
  await installTools(options);
  return capture(PWSH, pwshArgs(options, script, args));
};

/** Every program the helper starts is also listed here by host.cs, for display only; the job object is authoritative. */
const recordFile = (options: Options) => `${paths(options).logs}\\processes.jsonl`;

/**
 * The processes in the task's job object (job.ps1). host.cs creates every program suspended inside the job, and its
 * children cannot leave it, so this is exactly what the task started; with `stop`, the job is terminated first.
 */
const listProcesses = async (options: Options, stop = false): Promise<WindowsProcess[]> => {
  const { code, stdout, stderr } = await runPwsh(options, 'job.ps1', [
    '-Task',
    options.task,
    ...(stop ? ['-Stop'] : [])
  ]);
  if (code !== 0) {
    throw new Error(`Listing the task's job failed: ${stderr.trim()}`);
  }
  const parsed = JSON.parse(stdout.trim() || '[]');
  return Array.isArray(parsed) ? parsed : [parsed];
};

/** The CLI processes a user would have started: stacktape.exe whose parent is not another stacktape.exe. */
const findCliRoots = (processes: WindowsProcess[]) => {
  const byPid = new Map(processes.map((process) => [process.pid, process]));
  return processes.filter(
    (process) => process.name === 'stacktape.exe' && byPid.get(process.parentPid)?.name !== 'stacktape.exe'
  );
};

const consoleStateFile = (options: Options) => `${paths(options).logs}\\console.json`;
const consoleOutputFile = (options: Options) => `${paths(options).logs}\\console-output.log`;

/** The hidden desktop of --window consoles (host.cs): their windows never appear on the user's screen. */
const desktopName = (options: Options) => `stacktape-wsl-${options.task}`;

const readConsoleState = async (
  options: Options
): Promise<
  | {
      mode?: 'pty' | 'window';
      pid?: number;
      conhostPid?: number;
      exitCode?: number;
      inputPipe?: string;
      error?: string;
    }
  | undefined
> => {
  const file = toWslPath(consoleStateFile(options));
  if (!existsSync(file)) {
    return undefined;
  }
  const text = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '').trim();
  return text ? JSON.parse(text) : undefined;
};

const resolveTargetPid = async (options: Options) => {
  if (options.pid) {
    return options.pid;
  }
  const state = await readConsoleState(options);
  const running = await listProcesses(options);
  // The recorded console program, whatever its name, while it is still in the task's job.
  if (state?.pid && state.exitCode === undefined && running.some((process) => process.pid === state.pid)) {
    return state.pid;
  }
  const roots = findCliRoots(running);
  if (roots.length === 1) {
    return roots[0].pid;
  }
  return fail(
    roots.length
      ? `Several CLI processes run (${roots.map((process) => process.pid).join(', ')}); pass --pid.`
      : 'No console program or stacktape.exe of this task is running.'
  );
};

/** `--cwd`: a staged project name, a Windows drive path, or a /mnt path. Defaults to the task folder. */
const resolveWindowsCwd = async (options: Options) => {
  const cwd = !options.cwd
    ? paths(options).task
    : /^[A-Za-z]:[\\/]/.test(options.cwd)
      ? options.cwd.replace(/\//g, '\\')
      : options.cwd.startsWith('/')
        ? toWindowsPath(options.cwd)
        : `${paths(options).projects}\\${options.cwd}`;
  if (!options.cwd) {
    await ensureSafeDirectory(cwd);
  } else if (!existsSync(toWslPath(cwd))) {
    fail(`The working directory ${cwd} does not exist. --cwd takes a staged project name or an absolute path.`);
  }
  return cwd;
};

const DEV_CONTROL_PLANE = 'https://dev-api.stacktape.com';

/**
 * The dev Console login of the WSL source CLI (`pnpm dev:cli login`). The Windows CLI receives it only in its
 * environment, the way the CLI hands its key to child processes; it is never written to the Windows side or printed.
 */
const readDevApiKey = async () => {
  if (process.env.STACKTAPE_API_KEY) {
    return process.env.STACKTAPE_API_KEY;
  }
  const file = join(homedir(), '.stacktape', 'persisted-state.json');
  const state = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : undefined;
  const apiKey = state?.authentication?.apiKeysByEndpoint?.[DEV_CONTROL_PLANE];
  return typeof apiKey === 'string' && apiKey ? apiKey : fail('No dev Console login in WSL; run `pnpm dev:cli login`.');
};

/**
 * The variables passed to Windows (names only are printed) and the matching WSLENV. By default the Windows CLI uses
 * the dev Console with the WSL dev login, like the source CLI. `--control-plane user` keeps whatever login the Windows
 * profile has, which is the owner's production Console.
 */
const windowsEnvironment = async (options: Options) => {
  assertAwsProfile(process.env, [...ALLOWED_PROFILES, ...options.allowProfile]);
  const added: Record<string, string> = {
    // Dev-agent tokens and dev-proxy state stay in the task folder instead of the owner's profile.
    STACKTAPE_DEV_AGENT_TOKEN_DIR:
      process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR ?? `${paths(options).task}\\state\\dev-agent-tokens`,
    STACKTAPE_DEV_PROXY_STATE_DIR:
      process.env.STACKTAPE_DEV_PROXY_STATE_DIR ?? `${paths(options).task}\\state\\dev-proxy`,
    ...(options.controlPlane === 'dev'
      ? { STP_CUSTOM_TRPC_API_ENDPOINT: DEV_CONTROL_PLANE, STACKTAPE_API_KEY: await readDevApiKey() }
      : {})
  };
  const merged = { ...process.env, ...added };
  const names = selectPassThroughNames({ environment: merged, extraNames: [...options.env, ...Object.keys(added)] });
  // PATH is replaced, not passed: the Windows program gets the Windows PATH, current as of now.
  const environment = {
    ...merged,
    PATH: await readWindowsPath(),
    WSLENV: buildWslEnv({ names: [...names, 'PATH'], existing: process.env.WSLENV })
  };
  return { names, environment };
};

/** The Windows PATH for programs started now (`mergeWindowsPath`). */
const readWindowsPath = async () => {
  const { code, stdout, stderr } = await capture(PWSH, [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    "[Environment]::ExpandEnvironmentVariables([Environment]::GetEnvironmentVariable('Path','Machine') + ';' + " +
      "[Environment]::GetEnvironmentVariable('Path','User')); $env:Path"
  ]);
  const [registry, session] = stdout.split('\n');
  if (code !== 0 || !registry || !session) {
    throw new Error(`Reading the Windows PATH failed: ${stderr.trim()}`);
  }
  return mergeWindowsPath({ registry, session });
};

/**
 * Starts a program through host.ps1, which records its PID and creation time for ps and kill, and refuses to start
 * when the Windows side does not see the expected AWS_PROFILE.
 */
const startThroughHost = async (
  options: Options,
  {
    mode,
    program,
    commandLine,
    cwd,
    environment,
    detach = false
  }: {
    mode: 'exec' | 'pty' | 'window';
    program: string;
    commandLine: string;
    cwd: string;
    environment: NodeJS.ProcessEnv;
    detach?: boolean;
  }
) => {
  await ensureSafeDirectory(paths(options).logs);
  await installTools(options);
  const child = spawn(
    PWSH,
    pwshArgs(options, 'host.ps1', [
      '-Task',
      options.task,
      '-Mode',
      mode,
      '-CommandLine',
      commandLine,
      '-Program',
      program,
      '-WorkingDirectory',
      cwd,
      '-RecordFile',
      recordFile(options),
      '-ExpectedProfile',
      process.env.AWS_PROFILE ?? '',
      ...(mode === 'exec'
        ? []
        : [
            '-StateFile',
            consoleStateFile(options),
            '-OutputFile',
            consoleOutputFile(options),
            '-DesktopName',
            desktopName(options)
          ])
    ]),
    { cwd: WINDOWS_CWD, env: environment, stdio: detach ? 'ignore' : 'inherit', detached: detach }
  );
  if (detach) {
    child.unref();
    return undefined;
  }
  return waitForExit(child);
};

const requireCli = (options: Options) => {
  if (!existsSync(toWslPath(paths(options).exe))) {
    fail(`${paths(options).exe} does not exist; run the build command first.`);
  }
};

const commands: Record<string, (options: Options, rest: string[]) => Promise<number>> = {
  async doctor(options) {
    const taskPaths = paths(options);
    const report: [string, string][] = [];
    // The same PATH that run, exec and console give the Windows CLI.
    const env = {
      ...process.env,
      PATH: await readWindowsPath(),
      WSLENV: buildWslEnv({ names: ['PATH'], existing: process.env.WSLENV })
    };
    const check = async (label: string, command: string, args: string[], linux = false) => {
      const { code, stdout, stderr } = await capture(command, args, linux ? {} : { env }).catch((error) => ({
        code: 1,
        stdout: '',
        stderr: String(error)
      }));
      report.push([label, code === 0 ? stdout.trim().split('\n')[0] : `FAILED: ${(stderr || stdout).trim()}`]);
    };
    await check('pwsh', PWSH, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']);
    await check('aws.exe', CMD, ['/d', '/c', 'aws --version']);
    await check('node.exe', CMD, ['/d', '/c', 'node --version']);
    await check('docker (Windows)', CMD, [
      '/d',
      '/c',
      'docker version --format client={{.Client.Version}},server={{.Server.Version}}/{{.Server.Os}}'
    ]);
    const profile = process.env.AWS_PROFILE;
    if (profile) {
      await check(`AWS account (${profile}, Windows)`, CMD, [
        '/d',
        '/c',
        `aws sts get-caller-identity --profile ${profile} --query Account --output text`
      ]);
    } else {
      report.push(['AWS profile', 'FAILED: AWS_PROFILE is not set']);
    }
    await check('WSL networking mode', 'wslinfo', ['--networking-mode'], true);
    const ancestors = ['C:\\package.json', `${DEFAULT_WINDOWS_ROOT}\\package.json`];
    const found = ancestors.filter((path) => existsSync(toWslPath(path)));
    report.push(['parent package.json', found.length ? `FOUND ${found.join(', ')}: it changes module type` : 'none']);
    report.push(['task folder', `${taskPaths.task} (${existsSync(toWslPath(taskPaths.task)) ? 'exists' : 'absent'})`]);
    report.push(['staged CLI', existsSync(toWslPath(taskPaths.exe)) ? taskPaths.exe : 'not built']);
    for (const [label, value] of report) {
      console.info(`${label.padEnd(38)} ${value}`);
    }
    return report.some(([, value]) => value.startsWith('FAILED') && !value.includes('docker')) ? 1 : 0;
  },

  async build(options) {
    const taskPaths = paths(options);
    const roots = findCliRoots(await listProcesses(options).catch(() => []));
    if (roots.length) {
      return fail(`stacktape.exe still runs from this task (${roots.map((p) => p.pid).join(', ')}); run kill first.`);
    }
    const started = Date.now();
    const distFolderPath = join(LINUX_BUILD_ROOT, options.task, 'dist');
    // Imported here: the release build modules load bundler plugins that the other commands do not need.
    const { buildDistFolder } = await import('../build-dist-package');
    const folder = await buildDistFolder({
      platform: 'win',
      version: options.version,
      distFolderPath,
      bytecodeDepth: options.bytecode ? 1 : 'off'
    });
    const built = Date.now();
    const target = toWslPath(taskPaths.cli);
    await removeWindowsFolder(taskPaths.cli);
    await ensureSafeDirectory(taskPaths.cli);
    // One tar stream is faster than many small writes over the WSL file share; the dist folder has no symlinks.
    const code = await run('/bin/sh', ['-c', 'tar -C "$1" -cf - . | tar -C "$2" -xf -', 'sh', folder, target], {
      cwd: '/'
    });
    if (code !== 0) {
      return fail(`Copying the build to ${taskPaths.cli} failed.`);
    }
    log(
      `built ${taskPaths.exe} in ${((built - started) / 1000).toFixed(1)} s, copied in ${((Date.now() - built) / 1000).toFixed(1)} s` +
        ` (bytecode ${options.bytecode ? 'on' : 'off'})`
    );
    return 0;
  },

  async stage(options, rest) {
    const source = rest[0] ? resolve(rest[0]) : fail('Pass the project folder to stage.');
    const name = options.name ?? basename(source);
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      return fail(`Invalid project name ${name}; pass --name.`);
    }
    const destination = `${paths(options).projects}\\${name}`;
    const started = Date.now();
    await removeWindowsFolder(destination);
    await ensureSafeDirectory(destination);
    const excludes = [...(options.includeNodeModules ? [] : DEFAULT_STAGE_EXCLUDES), ...options.exclude];
    // `-h` copies symlink targets: Windows cannot follow symlinks into the WSL file system.
    const code = await run(
      '/bin/sh',
      [
        '-c',
        'src="$1"; dst="$2"; shift 2; tar -C "$src" -chf - "$@" . | tar -C "$dst" -xf -',
        'sh',
        source,
        toWslPath(destination),
        ...excludes.map((pattern) => `--exclude=${pattern}`)
      ],
      { cwd: '/' }
    );
    if (code !== 0) {
      return fail(`Copying ${source} failed.`);
    }
    log(`staged ${source} at ${destination} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    console.info(destination);
    return 0;
  },

  async run(options, rest) {
    requireCli(options);
    const { names, environment } = await windowsEnvironment(options);
    const cwd = await resolveWindowsCwd(options);
    const commandLine = buildWindowsCommandLine(paths(options).exe, rest);
    log(`${commandLine} (cwd ${cwd}; env ${names.join(', ')})`);
    return (await startThroughHost(options, {
      mode: 'exec',
      program: 'stacktape.exe',
      commandLine,
      cwd,
      environment
    })) as number;
  },

  async exec(options, rest) {
    if (!rest.length) {
      return fail('Pass the Windows command after --.');
    }
    const { names, environment } = await windowsEnvironment(options);
    const cwd = await resolveWindowsCwd(options);
    log(`cmd.exe /d /c ${rest.join(' ')} (cwd ${cwd}; env ${names.join(', ')})`);
    return (await startThroughHost(options, {
      mode: 'exec',
      program: rest[0],
      commandLine: buildWindowsCommandLine('C:\\Windows\\System32\\cmd.exe', ['/d', '/c', ...rest]),
      cwd,
      environment
    })) as number;
  },

  async console(options, rest) {
    if (!options.program) {
      requireCli(options);
    } else if (!/^[A-Za-z]:\\[^"]+\.exe$/i.test(options.program)) {
      return fail('--program takes an absolute Windows path to an .exe.');
    }
    const { names, environment } = await windowsEnvironment(options);
    const previous = await readConsoleState(options);
    if (previous?.pid && previous.exitCode === undefined) {
      const running = await listProcesses(options);
      if (running.some((process) => process.pid === previous.pid)) {
        return fail(`Console program ${previous.pid} still runs; wait for it, ctrl-c it or kill it first.`);
      }
    }
    await ensureSafeDirectory(paths(options).logs);
    await rm(toWslPath(consoleStateFile(options)), { force: true });
    const cwd = await resolveWindowsCwd(options);
    const program = options.program ?? paths(options).exe;
    const commandLine = buildWindowsCommandLine(program, rest);
    const mode = options.window ? 'window' : 'pty';
    log(
      `console (${mode === 'pty' ? 'pseudo console, no window' : 'window on a hidden desktop'}): ${commandLine} (cwd ${cwd}; env ${names.join(', ')})`
    );
    const started = startThroughHost(options, {
      mode,
      program: program.split('\\').at(-1) ?? program,
      commandLine,
      cwd,
      environment,
      detach: options.detach
    });
    if (!options.detach) {
      const code = (await started) as number;
      log(`console program exited with ${code}; its output is in ${consoleOutputFile(options)} (output command)`);
      return code;
    }
    await started;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const state = await readConsoleState(options).catch(() => undefined);
      if (state?.pid || state?.error) {
        console.info(JSON.stringify(state));
        return state.pid ? 0 : 1;
      }
      await Bun.sleep(200);
    }
    return fail('The console program did not report its PID within 20 s.');
  },

  async wait(options) {
    const deadline = Date.now() + options.timeout * 1000;
    while (Date.now() < deadline) {
      const state = await readConsoleState(options).catch(() => undefined);
      if (state?.exitCode !== undefined) {
        log(`console program ${state.pid} exited with ${state.exitCode}`);
        return state.exitCode;
      }
      if (!state) {
        return fail('No console program was started for this task.');
      }
      await Bun.sleep(500);
    }
    return fail(`The console program still runs after ${options.timeout} s.`);
  },

  async screen(options) {
    const pid = await resolveTargetPid(options);
    const { code, stdout, stderr } = await runPwsh(options, 'read-screen.ps1', [
      '-TargetPid',
      String(pid),
      '-Lines',
      String(options.lines)
    ]);
    process.stdout.write(`${stdout.trimEnd()}\n`);
    if (code !== 0) {
      log(stderr.trim());
    }
    return code;
  },

  async output(options) {
    const file = toWslPath(consoleOutputFile(options));
    if (!existsSync(file)) {
      return fail('No pseudo console output for this task.');
    }
    const lines = stripTerminalSequences(await readFile(file, 'utf8')).split('\n');
    console.info(lines.slice(-options.lines).join('\n'));
    return 0;
  },

  async keys(options, rest) {
    const state = await readConsoleState(options);
    if (state?.mode !== 'pty' || state.exitCode !== undefined) {
      return fail('keys types into a running pseudo console started by the console command.');
    }
    // host.cs owns the pipe, and only the current user can connect to it.
    const { code, stderr } = await runPwsh(options, 'send-keys.ps1', [
      '-PipeName',
      state.inputPipe ?? '',
      '-Base64',
      Buffer.from(encodeKeys(rest), 'utf8').toString('base64')
    ]);
    if (code !== 0) {
      return fail(`Typing into the pseudo console failed: ${stderr.trim()}`);
    }
    log(`typed ${rest.join(' ')}`);
    return 0;
  },

  async 'ctrl-c'(options) {
    const pid = await resolveTargetPid(options);
    const { code, stderr } = await runPwsh(options, 'send-ctrl.ps1', [
      '-TargetPid',
      String(pid),
      ...(options.break ? ['-Break'] : [])
    ]);
    log(code === 0 ? `sent Ctrl+${options.break ? 'Break' : 'C'} to the console of ${pid}` : stderr.trim());
    return code;
  },

  async close(options) {
    // Closing the console window, like clicking its X: Windows sends CTRL_CLOSE_EVENT and ends the program 5 s later.
    // The window belongs to the program, not to conhost.exe, so `taskkill /pid <conhost>` does not close it.
    if (!options.pid && (await readConsoleState(options))?.mode !== 'window') {
      return fail('close needs a console started with --window; a pseudo console has no window.');
    }
    const pid = await resolveTargetPid(options);
    const { code, stdout, stderr } = await runPwsh(options, 'close-window.ps1', [
      '-TargetPid',
      String(pid),
      '-DesktopName',
      desktopName(options)
    ]);
    log(code === 0 ? `asked the console window of ${pid} to close` : (stderr || stdout).trim());
    return code;
  },

  async ps(options) {
    const processes = await listProcesses(options);
    for (const process of processes) {
      console.info(
        `${String(process.pid).padStart(6)} ${String(process.parentPid).padStart(6)} ${process.name} ${process.path ?? ''}`
      );
    }
    log(`${processes.length} process(es) from ${paths(options).task}`);
    return 0;
  },

  async kill(options) {
    return (await stopAll(options)) ? 0 : 1;
  },

  async cleanup(options) {
    const taskPaths = paths(options);
    let clean = true;
    if (existsSync(toWslPath(taskPaths.task))) {
      clean = await stopAll(options);
      await removeWindowsFolder(taskPaths.task);
    }
    if (existsSync(toWslPath(taskPaths.task))) {
      log(`${taskPaths.task} still exists (a file is probably in use).`);
      clean = false;
    }
    const root = toWslPath(DEFAULT_WINDOWS_ROOT);
    if (existsSync(root) && (await readdir(root)).length === 0) {
      await rmdir(root);
    }
    await rm(join(LINUX_BUILD_ROOT, options.task), { recursive: true, force: true });
    log(clean ? `removed ${taskPaths.task} and ${join(LINUX_BUILD_ROOT, options.task)}` : 'cleanup incomplete');
    return clean ? 0 : 1;
  }
};

const stopAll = async (options: Options) => {
  if (!existsSync(toWslPath(paths(options).task))) {
    return true;
  }
  const running = await listProcesses(options);
  const remaining = await listProcesses(options, true);
  if (running.length) {
    log(`ended the task's job: ${running.map((process) => `${process.name} ${process.pid}`).join(', ')}`);
  }
  if (remaining.length) {
    log(`still running: ${remaining.map((process) => `${process.name} ${process.pid}`).join(', ')}`);
  }
  return remaining.length === 0;
};

/**
 * Deletes a folder inside C:\\stacktape-wsl with remove-tree.ps1. The script runs from -EncodedCommand and gets the path
 * from an environment variable, so the path is never parsed by cmd.exe and the script does not live in the folder it
 * deletes. It refuses when the root or a component above the target is a link and removes links as links.
 */
const removeWindowsFolder = async (windowsPath: string) => {
  if (!existsSync(toWslPath(windowsPath)) && !isLink(windowsPath)) {
    return;
  }
  const script = await readFile(join(import.meta.dir, 'remove-tree.ps1'), 'utf8');
  const { code, stderr } = await capture(
    PWSH,
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
    {
      env: {
        ...process.env,
        STACKTAPE_REMOVE_PATH: windowsPath,
        WSLENV: buildWslEnv({ names: ['STACKTAPE_REMOVE_PATH'], existing: process.env.WSLENV })
      }
    }
  );
  if (code !== 0) {
    throw new Error(`Deleting ${windowsPath} failed: ${stderr.trim()}`);
  }
};

const parseOptions = (argv: string[]) => {
  const separator = argv.indexOf('--');
  const own = separator === -1 ? argv : argv.slice(0, separator);
  const passthrough = separator === -1 ? [] : argv.slice(separator + 1);
  const { values, positionals } = parseArgs({
    args: own,
    allowPositionals: true,
    options: {
      task: { type: 'string' },
      cwd: { type: 'string' },
      name: { type: 'string' },
      env: { type: 'string', multiple: true },
      exclude: { type: 'string', multiple: true },
      'allow-profile': { type: 'string', multiple: true },
      'include-node-modules': { type: 'boolean' },
      pid: { type: 'string' },
      lines: { type: 'string' },
      timeout: { type: 'string' },
      bytecode: { type: 'boolean' },
      break: { type: 'boolean' },
      detach: { type: 'boolean' },
      window: { type: 'boolean' },
      program: { type: 'string' },
      version: { type: 'string' },
      'control-plane': { type: 'string' },
      help: { type: 'boolean' }
    }
  });
  const [command, ...rest] = positionals;
  if (values.help || !command || !commands[command]) {
    console.info(USAGE);
    process.exit(command && !values.help ? 2 : 0);
  }
  const options: Options = {
    task: assertTaskId(values.task),
    cwd: values.cwd,
    name: values.name,
    env: values.env ?? [],
    exclude: values.exclude ?? [],
    allowProfile: values['allow-profile'] ?? [],
    pid: values.pid ? Number(values.pid) : undefined,
    lines: Number(values.lines ?? 60),
    timeout: Number(values.timeout ?? 600),
    bytecode: Boolean(values.bytecode),
    break: Boolean(values.break),
    detach: Boolean(values.detach),
    window: Boolean(values.window),
    program: values.program,
    version: values.version ?? 'dev',
    includeNodeModules: Boolean(values['include-node-modules']),
    controlPlane: values['control-plane'] === 'user' ? 'user' : 'dev'
  };
  if (values['control-plane'] && !['dev', 'user'].includes(values['control-plane'])) {
    fail('--control-plane takes dev or user.');
  }
  paths(options);
  return { command, options, rest: [...rest, ...passthrough] };
};

/**
 * A root or task folder that is a junction or symbolic link would make the helper write and delete somewhere else.
 * WSL shows Windows junctions as symbolic links. Only cleanup proceeds, and it removes the link itself.
 */
const isLink = (windowsPath: string) => {
  try {
    return lstatSync(toWslPath(windowsPath)).isSymbolicLink();
  } catch {
    return false;
  }
};

const guardAgainstLinks = async (command: string, options: Options) => {
  if (isLink(DEFAULT_WINDOWS_ROOT)) {
    return fail(`${DEFAULT_WINDOWS_ROOT} is a link; refusing to use it.`);
  }
  const { task } = paths(options);
  if (!isLink(task)) {
    return undefined;
  }
  if (command !== 'cleanup') {
    return fail(`${task} is a link; refusing to use it. Run cleanup to remove the link.`);
  }
  await removeWindowsFolder(task);
  log(`removed the link ${task} without touching its target`);
  return 0;
};

if (import.meta.main) {
  Promise.resolve()
    .then(async () => {
      const { command, options, rest } = parseOptions(process.argv.slice(2));
      return (await guardAgainstLinks(command, options)) ?? commands[command](options, rest);
    })
    .then(
      (code) => process.exit(code),
      (error) => fail(error instanceof Error ? error.message : String(error))
    );
}
