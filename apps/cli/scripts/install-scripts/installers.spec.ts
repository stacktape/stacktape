import { expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import * as tar from 'tar';
import { prepareInstallAssets } from '../publish-install-scripts';
import { generateReleaseChecksums } from '../release/checksums';

const archives = ['linux', 'linux-arm', 'alpine', 'macos', 'macos-arm'];

/** What `uname -s`, `uname -m`, `sysctl -n hw.optional.arm64` and `ldd --version` report on a machine. */
type Machine = { system: string; processor: string; appleSilicon?: boolean; musl?: boolean };

/** One machine for each release archive, named after the archive it must receive. */
const MACHINES: Record<string, Machine> = {
  linux: { system: 'Linux', processor: 'x86_64' },
  'linux-arm': { system: 'Linux', processor: 'aarch64' },
  alpine: { system: 'Linux', processor: 'x86_64', musl: true },
  macos: { system: 'Darwin', processor: 'x86_64' },
  'macos-arm': { system: 'Darwin', processor: 'arm64', appleSilicon: true }
};
/** How the installer reaches `sh`: as a file, or piped like `curl ... | sh -s -- <args>`, optionally in a terminal. */
type RunOptions = { args?: string[]; piped?: 'detached' | 'terminal' };

const stale = [
  'llm-docs/old.txt',
  'ai-docs/old.txt',
  'compiled-cli.js.map',
  'pack/old',
  'nixpacks/old',
  'session-manager-plugin/old'
];

const fixture = async (machine: Machine) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-installer-'));
  try {
    const home = join(root, 'home');
    const bin = join(home, '.stacktape', 'bin');
    const commands = join(root, 'commands');
    const payload = join(root, 'payload');
    const downloads = join(root, 'downloads');
    for (const directory of [bin, commands, payload, downloads]) await mkdir(directory, { recursive: true });
    await writeFile(join(home, '.bashrc'), '# customer shell\n');
    await writeFile(join(home, '.profile'), '# customer shell\n');
    // When asked, the candidate also records each argument and what its standard input is.
    await writeFile(
      join(payload, 'stacktape'),
      `#!/bin/sh
printf "candidate executable: %s\\n" "$*"
if [ -n "\${INSTALLER_CLI_RECORD:-}" ]; then
  {
    for argument in "$@"; do printf 'arg=%s\\n' "$argument"; done
    if [ -t 0 ]; then echo stdin=terminal; elif [ -p /dev/stdin ]; then echo stdin=pipe; elif [ -c /dev/stdin ]; then
      echo stdin=device
    else echo stdin=other; fi
    case ":$PATH:" in *":$HOME/.stacktape/bin:"*) echo path=install-directory ;; esac
  } > "$INSTALLER_CLI_RECORD"
fi
exit "\${INSTALLER_CLI_EXIT:-0}"
`
    );
    await mkdir(join(payload, 'llm-docs'));
    await writeFile(join(payload, 'llm-docs', 'current.txt'), 'current docs');
    await mkdir(join(payload, 'init-ui'));
    await writeFile(join(payload, 'init-ui', 'index.html'), 'current wizard');
    // Every archive of the release, so an installer that picks the wrong platform's build still finds it.
    for (const archive of archives) {
      await tar.c({ gzip: true, file: join(downloads, `${archive}.tar.gz`), cwd: payload }, [
        'stacktape',
        'llm-docs',
        'init-ui'
      ]);
    }
    await generateReleaseChecksums({ directory: downloads });
    const requests = join(root, 'requests.log');
    await writeFile(
      join(commands, 'uname'),
      `#!/bin/sh
case "$1" in
  -m) echo ${machine.processor} ;;
  -s) echo ${machine.system} ;;
  *) exec ${Bun.which('uname')} "$@" ;;
esac
`,
      { mode: 0o755 }
    );
    await writeFile(
      join(commands, 'sysctl'),
      machine.appleSilicon ? '#!/bin/sh\necho 1\n' : '#!/bin/sh\necho "sysctl: unknown oid" >&2\nexit 1\n',
      { mode: 0o755 }
    );
    await writeFile(
      join(commands, 'ldd'),
      machine.musl
        ? '#!/bin/sh\necho "musl libc (x86_64)" >&2\nexit 1\n'
        : '#!/bin/sh\necho "ldd (Ubuntu GLIBC 2.39-0ubuntu8) 2.39"\n',
      { mode: 0o755 }
    );
    // `id -u` says root only when the test asks.
    await writeFile(
      join(commands, 'id'),
      `#!/bin/sh\nif [ "$1" = -u ] && [ -n "\${INSTALLER_AS_ROOT:-}" ]; then echo 0; else exec ${Bun.which('id')} "$@"; fi\n`,
      { mode: 0o755 }
    );
    // Substitute only the download boundary. Every other command, including hashing and extraction, is real. With
    // INSTALLER_SLOW_CHUNKS, the archive arrives in that many pieces over about a second, as over a real network.
    await writeFile(
      join(commands, 'curl'),
      `#!/bin/sh
set -eu
output=''
headers=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) output="$2"; shift 2 ;;
    -D) headers="$2"; shift 2 ;;
    https://github.com/stacktape/stacktape/releases/download/*) url="$1"; shift ;;
    *) shift ;;
  esac
done
[ -n "$output" ] && [ -n "\${url:-}" ] || exit 81
printf '%s\\n' "\${url##*/}" >> "$INSTALLER_REQUESTS"
source="$INSTALLER_DOWNLOADS/\${url##*/}"
[ -f "$source" ] || exit 22
size=$(wc -c < "$source" | tr -d ' ')
[ -z "$headers" ] || printf 'HTTP/2 200\\r\\ncontent-length: %s\\r\\n\\r\\n' "$size" > "$headers"
chunks=\${INSTALLER_SLOW_CHUNKS:-1}
chunk_size=$(( (size + chunks - 1) / chunks ))
: > "$output"
i=0
while [ "$i" -lt "$chunks" ]; do
  dd if="$source" bs="$chunk_size" skip="$i" count=1 2>/dev/null >> "$output"
  i=$((i + 1))
  [ "$chunks" -eq 1 ] || sleep 0.01
done
`,
      { mode: 0o755 }
    );
    await writeFile(
      join(commands, 'apk'),
      `#!/bin/sh
[ "$1 $2" = 'info --installed' ] || exit 82
[ "\${INSTALLER_MISSING_RUNTIME:-}" != "$3" ]
`,
      { mode: 0o755 }
    );
    const script = join(root, 'install.sh');
    const assets = await prepareInstallAssets({ version: '4.0.0-preview.17' });
    await writeFile(script, assets.find(({ key }) => key === 'linux.sh')!.body);
    const command = ({ args = [], piped }: RunOptions) => {
      if (!piped) return ['sh', script, ...args];
      // setsid leaves no controlling terminal, as in CI or a coding agent's shell. script(1) gives the pipeline a new
      // pseudo-terminal, as when a person types the command.
      if (piped === 'detached') return ['setsid', 'sh', '-s', '--', ...args];
      return ['script', '-qec', `cat '${script}' | sh -s -- ${args.join(' ')}`, '/dev/null'];
    };
    const run = (extra: Record<string, string | undefined> = {}, options: RunOptions = {}) => {
      const result = Bun.spawnSync({
        cmd: command(options),
        stdin: options.piped === 'detached' ? Bun.file(script) : 'ignore',
        env: Object.fromEntries(
          Object.entries({
            PATH: [commands, process.env.PATH].join(delimiter),
            HOME: home,
            SHELL: '/bin/bash',
            TERM: 'xterm-256color',
            INSTALLER_DOWNLOADS: downloads,
            INSTALLER_REQUESTS: requests,
            ...extra
          }).filter((entry): entry is [string, string] => entry[1] !== undefined)
        ),
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 15_000
      });
      return Object.assign(result, {
        output: stripVTControlCharacters(result.stdout.toString() + result.stderr.toString())
      });
    };
    /** The release archives the installer downloaded, without the checksum manifest. */
    const downloaded = async () =>
      existsSync(requests)
        ? (await readFile(requests, 'utf8')).split('\n').filter((name) => name && name !== 'SHA256SUMS')
        : [];
    return { root, bin, home, downloads, run, downloaded, record: join(root, 'cli-record.txt') };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
};

test.skipIf(process.platform === 'win32').each(archives)(
  'the installer on a %s machine rejects tampering, then upgrades and runs offline',
  async (archive) => {
    const shellConfig = archive === 'alpine' ? '.profile' : '.bashrc';
    const shell = archive === 'alpine' ? '/bin/ash' : '/bin/bash';
    const { root, bin, home, downloads, run, downloaded } = await fixture(MACHINES[archive]);
    try {
      await writeFile(join(bin, 'stacktape'), 'previous installation');
      for (const path of [...stale, 'init-ui/old-asset.js']) {
        const target = join(bin, path);
        await mkdir(join(target, '..'), { recursive: true });
        await writeFile(target, 'stale');
      }
      const manifest = await readFile(join(downloads, 'SHA256SUMS'));
      await writeFile(join(downloads, 'SHA256SUMS'), `${'0'.repeat(64)}  ${archive}.tar.gz\n`);
      const rejected = run({ SHELL: shell });
      expect(rejected.exitCode).not.toBe(0);
      expect(rejected.stderr.toString()).toContain('Checksum verification failed');
      expect(await readFile(join(bin, 'stacktape'), 'utf8')).toBe('previous installation');
      expect(await readFile(join(bin, 'llm-docs/old.txt'), 'utf8')).toBe('stale');
      await writeFile(join(downloads, 'SHA256SUMS'), manifest);
      const installed = run({ SHELL: shell });
      expect(installed.exitCode, installed.output).toBe(0);
      expect(await downloaded()).toEqual([`${archive}.tar.gz`, `${archive}.tar.gz`]);
      // An update says so and does not repeat the first steps. Output to a log has no colors and no logo.
      expect(installed.stdout.toString()).toBe(
        [
          '',
          'Updating stacktape to 4.0.0-preview.17',
          `Added ~/.stacktape/bin to PATH in ~/${shellConfig}`,
          'Installed stacktape 4.0.0-preview.17 in ~/.stacktape/bin',
          'Release notes: https://github.com/stacktape/stacktape/releases/tag/4.0.0-preview.17',
          '',
          ''
        ].join('\n')
      );
      for (const path of stale) expect(existsSync(join(bin, path)), path).toBe(false);
      expect(await readFile(join(bin, 'llm-docs/current.txt'), 'utf8')).toBe('current docs');
      // A directory in the release replaces the installed one, so files from an older release do not pile up.
      expect(readdirSync(join(bin, 'init-ui'))).toEqual(['index.html']);
      for (const alias of ['stacktape', 'stp']) {
        const result = Bun.spawnSync([join(bin, alias), '--version'], { stdout: 'pipe', stderr: 'pipe' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toBe('candidate executable: --version\n');
      }
      // The 80 MB download and the unpacked copy do not stay behind.
      expect(readdirSync(join(home, '.stacktape'))).toEqual(['bin']);
      const shellConfigContent = await readFile(join(home, shellConfig), 'utf8');
      expect(shellConfigContent).toContain(bin);
      // A GitHub Actions job gets the directory on PATH for its later steps, and shell setup is not repeated.
      const githubPath = join(home, 'github-path');
      expect(run({ SHELL: shell, GITHUB_ACTIONS: 'true', GITHUB_PATH: githubPath }).exitCode).toBe(0);
      expect(await readFile(githubPath, 'utf8')).toBe(`${bin}\n`);
      expect(await readFile(join(home, shellConfig), 'utf8')).toBe(shellConfigContent);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000
);

// Every published .sh path serves the same script, so a visitor who copies the command for another platform, or a
// website that guesses Apple silicon for an Intel Mac, still gets the build the machine runs.
test.skipIf(process.platform === 'win32').each([
  ...archives.map((archive) => ({ name: archive, machine: MACHINES[archive], expected: `${archive}.tar.gz` })),
  // A Rosetta shell on Apple silicon reports x86_64; the native build is still the right one.
  {
    name: 'Rosetta',
    machine: { system: 'Darwin', processor: 'x86_64', appleSilicon: true },
    expected: 'macos-arm.tar.gz'
  }
])(
  'a fresh install on a $name machine downloads $expected and shows the first steps',
  async ({ machine, expected }) => {
    const { root, bin, run, downloaded } = await fixture(machine);
    try {
      const result = run();
      expect(result.exitCode, result.output).toBe(0);
      expect(await downloaded()).toEqual([expected]);
      expect(existsSync(join(bin, 'stacktape'))).toBe(true);
      expect(result.stdout.toString()).toContain('Installing stacktape 4.0.0-preview.17 for ');
      expect(result.stdout.toString()).toContain(
        'To get started:\n\nexec $SHELL      # Reload PATH (or open a new terminal)\ncd <project>     # Open your project\nstacktape init'
      );
      expect(result.stdout.toString()).not.toContain('candidate executable');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
);

test.skipIf(process.platform === 'win32').each([
  {
    machine: { system: 'Linux', processor: 'armv7l' },
    message: 'Stacktape has no Linux build for the armv7l processor.'
  },
  {
    machine: { system: 'Linux', processor: 'aarch64', musl: true },
    message: 'Stacktape has no Alpine Linux build for the aarch64 processor.'
  },
  { machine: { system: 'FreeBSD', processor: 'amd64' }, message: 'Stacktape has no build for FreeBSD.' },
  // Git Bash on Windows: point to the PowerShell installer instead of installing a Linux build that cannot run.
  {
    machine: { system: 'MINGW64_NT-10.0-26100', processor: 'x86_64' },
    message: 'On Windows, run this in PowerShell:\n  iex "& { $(irm https://installs.stacktape.com/windows.ps1) }"'
  }
])('the installer refuses a $machine.system $machine.processor machine', async ({ machine, message }) => {
  const { root, bin, run, downloaded } = await fixture(machine);
  try {
    const result = run();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain(message);
    expect(await downloaded()).toEqual([]);
    expect(existsSync(join(bin, 'stacktape'))).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform === 'win32')(
  'the installer on Alpine reports missing runtime packages before installation',
  async () => {
    const { root, bin, downloads, run } = await fixture(MACHINES.alpine);
    try {
      // With no downloads left, getting past the prerequisite check would fail for another reason.
      await rm(downloads, { recursive: true });
      for (const missing of ['libstdc++', 'libgcc', 'gcompat']) {
        const result = run({ INSTALLER_MISSING_RUNTIME: missing });
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain(`requires these Alpine packages: ${missing}`);
        expect(result.stderr.toString()).toContain('apk add --no-cache libstdc++ libgcc gcompat');
        expect(existsSync(join(bin, 'stacktape'))).toBe(false);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
);

// An archive that unpacks but lacks the executable must not replace a working installation.
test.skipIf(process.platform === 'win32')('a broken archive leaves the previous installation in place', async () => {
  const { root, bin, home, downloads, run } = await fixture(MACHINES.linux);
  try {
    await writeFile(join(bin, 'stacktape'), 'previous installation');
    await mkdir(join(bin, 'llm-docs'));
    await writeFile(join(bin, 'llm-docs', 'old.txt'), 'previous docs');
    const empty = join(root, 'empty');
    await mkdir(join(empty, 'llm-docs'), { recursive: true });
    await writeFile(join(empty, 'llm-docs', 'new.txt'), 'new docs');
    await rm(join(downloads, 'SHA256SUMS'));
    await tar.c({ gzip: true, file: join(downloads, 'linux.tar.gz'), cwd: empty }, ['llm-docs']);
    await generateReleaseChecksums({ directory: downloads });
    const result = run();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain('linux.tar.gz does not contain the stacktape executable.');
    expect(await readFile(join(bin, 'stacktape'), 'utf8')).toBe('previous installation');
    expect(await readFile(join(bin, 'llm-docs', 'old.txt'), 'utf8')).toBe('previous docs');
    expect(readdirSync(join(home, '.stacktape'))).toEqual(['bin']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// macOS defaults to zsh and many developers use fish; each gets its own configuration file and syntax.
const shells = [
  { shell: '/bin/zsh', file: '.zshrc', line: (bin: string) => `export PATH="${bin}:$PATH"` },
  { shell: '/usr/bin/fish', file: '.config/fish/config.fish', line: (bin: string) => `fish_add_path ${bin}` }
];
test.skipIf(process.platform === 'win32').each(shells)(
  'the installer adds the directory to PATH for $shell',
  async ({ shell, file, line }) => {
    const { root, bin, home, run } = await fixture(MACHINES.macos);
    try {
      await mkdir(join(home, file, '..'), { recursive: true });
      await writeFile(join(home, file), '# customer shell\n');
      const result = run({ SHELL: shell });
      expect(result.exitCode, result.output).toBe(0);
      expect(await readFile(join(home, file), 'utf8')).toContain(line(bin));
      expect(await readFile(join(home, '.bashrc'), 'utf8')).toBe('# customer shell\n');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
);

// A Docker build runs `RUN curl ... | sh` with no SHELL variable, often as root without sudo. STACKTAPE_NO_MODIFY_PATH
// leaves shell configuration to a dotfile manager or an image's own ENV PATH.
test.skipIf(process.platform === 'win32').each([
  { name: 'without SHELL, as in a Docker build', env: { SHELL: undefined, INSTALLER_AS_ROOT: '1' }, edited: '.bashrc' },
  { name: 'with STACKTAPE_NO_MODIFY_PATH', env: { STACKTAPE_NO_MODIFY_PATH: '1' }, edited: undefined }
])('the installer runs $name', async ({ env, edited }) => {
  const { root, bin, home, run } = await fixture(MACHINES.linux);
  try {
    const result = run(env);
    expect(result.exitCode, result.output).toBe(0);
    expect(existsSync(join(bin, 'stacktape'))).toBe(true);
    for (const file of ['.bashrc', '.profile']) {
      const content = await readFile(join(home, file), 'utf8');
      if (file === edited) expect(content).toContain(bin);
      else expect(content).toBe('# customer shell\n');
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform === 'win32')('the installer refuses to run under sudo unless asked to', async () => {
  const { root, bin, run } = await fixture(MACHINES.linux);
  try {
    const refused = run({ INSTALLER_AS_ROOT: '1', SUDO_USER: 'someone' });
    expect(refused.exitCode).not.toBe(0);
    expect(refused.stderr.toString()).toContain('Run the installer without sudo.');
    expect(existsSync(join(bin, 'stacktape'))).toBe(false);
    const allowed = run({ INSTALLER_AS_ROOT: '1', SUDO_USER: 'someone', STACKTAPE_ALLOW_SUDO: '1' });
    expect(allowed.exitCode, allowed.output).toBe(0);
    expect(existsSync(join(bin, 'stacktape'))).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// A new macOS account uses zsh but has no zsh configuration file yet. The installer creates `.zshrc` in zsh's
// configuration directory (ZDOTDIR when set), so the next terminal finds the CLI. An existing `.zshenv` is used instead.
test.skipIf(process.platform === 'win32').each([
  { account: 'an empty HOME', zdotdir: '', existing: '', expected: '.zshrc' },
  { account: 'ZDOTDIR', zdotdir: '.config/zsh', existing: '', expected: '.config/zsh/.zshrc' },
  { account: 'only .zshenv', zdotdir: '', existing: '.zshenv', expected: '.zshenv' }
])(
  'the installer sets up PATH for a zsh login shell with $account',
  async ({ zdotdir, existing, expected }) => {
    const { root, bin, home, run } = await fixture(MACHINES['macos-arm']);
    try {
      await rm(join(home, '.bashrc'));
      await rm(join(home, '.profile'));
      const zshEnvironment = zdotdir ? { ZDOTDIR: join(home, zdotdir) } : {};
      if (zdotdir) await mkdir(join(home, zdotdir), { recursive: true });
      if (existing) await writeFile(join(home, existing), '# customer shell\n');
      const result = run({ SHELL: '/bin/zsh', ...zshEnvironment });
      expect(result.exitCode, result.output).toBe(0);
      expect(result.output).not.toContain('Add stacktape to PATH');
      expect(await readFile(join(home, expected), 'utf8')).toContain(`export PATH="${bin}:$PATH"`);
      // Nothing else is written to HOME: no `.zshrc` beside an existing `.zshenv`, no files for other shells.
      expect(readdirSync(home).sort()).toEqual(['.stacktape', expected.split('/')[0]].sort());
      // The customer opens a new terminal: a zsh login shell with only the account's files and the system PATH.
      const shell = Bun.spawnSync({
        cmd: [Bun.which('zsh')!, '-l', '-i', '-c', 'command -v stacktape'],
        env: { HOME: home, PATH: '/usr/bin:/bin', TERM: 'dumb', ...zshEnvironment },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 15_000
      });
      expect(shell.exitCode, shell.stderr.toString()).toBe(0);
      expect(shell.stdout.toString().trim()).toBe(join(bin, 'stacktape'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000
);

// `curl -fsSL https://installs.stacktape.com/<platform>.sh | sh -s -- init` installs and starts `stacktape init`. The
// arguments reach the installed CLI unchanged, by its full path, and its exit code is the installer's.
test.skipIf(process.platform === 'win32' || !Bun.which('setsid'))(
  'the installer piped without a terminal runs the CLI with the arguments after its own and empty input',
  async () => {
    const { root, run, record } = await fixture(MACHINES.linux);
    try {
      const result = run(
        { INSTALLER_CLI_RECORD: record, INSTALLER_CLI_EXIT: '7' },
        { args: ['init', '--projectDirectory', 'my app'], piped: 'detached' }
      );
      expect(result.exitCode, result.output).toBe(7);
      expect(result.stdout.toString()).toContain(
        'Starting stacktape init --projectDirectory my app\nAfterwards, open a new terminal to use stacktape.\n'
      );
      // Starting the CLI replaces the first steps.
      expect(result.stdout.toString()).not.toContain('To get started');
      // Not the rest of the piped script: that would be read as input by the CLI.
      expect((await readFile(record, 'utf8')).trim().split('\n')).toEqual([
        'arg=init',
        'arg=--projectDirectory',
        'arg=my app',
        'stdin=device',
        'path=install-directory'
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000
);

test.skipIf(process.platform !== 'linux' || !Bun.which('script'))(
  'the installer piped in a terminal shows the logo and gives the CLI the terminal as its input',
  async () => {
    const { root, run, record } = await fixture(MACHINES.linux);
    try {
      const result = run({ INSTALLER_CLI_RECORD: record }, { args: ['init'], piped: 'terminal' });
      expect(result.exitCode, result.output).toBe(0);
      expect(result.output).toContain('▀▀▀▀ ▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀ ▀▀▀▀ █▀▀▀ ▀▀▀▀');
      expect(result.output).toContain('Starting stacktape init');
      expect((await readFile(record, 'utf8')).trim().split('\n')).toEqual([
        'arg=init',
        'stdin=terminal',
        'path=install-directory'
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000
);

// A progress line drawn for every received block can make a large download several times slower in a terminal. The
// installer redraws on a timer instead, so 200 pieces arriving over about two seconds give about 20 redraws, not 200.
test.skipIf(process.platform !== 'linux' || !Bun.which('script'))(
  'the progress line in a terminal redraws on a timer, not for every received piece',
  async () => {
    const { root, bin, run } = await fixture(MACHINES.linux);
    try {
      const result = run({ INSTALLER_SLOW_CHUNKS: '200' }, { piped: 'terminal' });
      expect(result.exitCode, result.output).toBe(0);
      expect(existsSync(join(bin, 'stacktape'))).toBe(true);
      const redraws = result.stdout
        .toString()
        .split('\r')
        .filter((segment) => segment.includes('%'));
      expect(redraws.length).toBeGreaterThan(2);
      expect(redraws.length).toBeLessThan(80);
      expect(stripVTControlCharacters(redraws.at(-1)!)).toStartWith('■■■■■■■■■■');
      expect(stripVTControlCharacters(redraws.at(-1)!)).toContain(' 100%');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000
);
