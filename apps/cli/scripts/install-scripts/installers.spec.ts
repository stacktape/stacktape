import { expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import * as tar from 'tar';
import { prepareInstallAssets } from '../publish-install-scripts';
import { generateReleaseChecksums } from '../release/checksums';

const installers = ['linux', 'linux-arm', 'alpine', 'macos', 'macos-arm'];

/** What `uname -m` and `sysctl -n hw.optional.arm64` report on a machine. */
type Machine = { processor: string; appleSilicon?: boolean };

/** Each installer's own kind of machine. */
const NATIVE_MACHINES: Record<string, Machine> = {
  linux: { processor: 'x86_64' },
  'linux-arm': { processor: 'aarch64' },
  alpine: { processor: 'x86_64' },
  macos: { processor: 'x86_64' },
  'macos-arm': { processor: 'arm64', appleSilicon: true }
};
const stale = [
  'llm-docs/old.txt',
  'ai-docs/old.txt',
  'compiled-cli.js.map',
  'pack/old',
  'nixpacks/old',
  'session-manager-plugin/old'
];

const fixture = async (platform: string, machine: Machine = NATIVE_MACHINES[platform]) => {
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
    await writeFile(join(payload, 'stacktape'), '#!/bin/sh\nprintf "candidate executable: %s\\n" "$*"\n');
    await mkdir(join(payload, 'llm-docs'));
    await writeFile(join(payload, 'llm-docs', 'current.txt'), 'current docs');
    // Every archive of the release, so an installer that picks another platform's build still finds it.
    for (const archive of installers) {
      await tar.c({ gzip: true, file: join(downloads, `${archive}.tar.gz`), cwd: payload }, ['stacktape', 'llm-docs']);
    }
    await generateReleaseChecksums({ directory: downloads });
    const requests = join(root, 'requests.log');
    await writeFile(
      join(commands, 'uname'),
      `#!/bin/sh\nif [ "$1" = -m ]; then echo ${machine.processor}; else exec ${Bun.which('uname')} "$@"; fi\n`,
      { mode: 0o755 }
    );
    await writeFile(
      join(commands, 'sysctl'),
      machine.appleSilicon ? '#!/bin/sh\necho 1\n' : '#!/bin/sh\necho "sysctl: unknown oid" >&2\nexit 1\n',
      { mode: 0o755 }
    );
    // Substitute only the download boundary. Every other command, including hashing and extraction, is real.
    await writeFile(
      join(commands, 'curl'),
      `#!/bin/sh
set -eu
output=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) output="$2"; shift 2 ;;
    https://github.com/stacktape/stacktape/releases/download/*) url="$1"; shift ;;
    *) shift ;;
  esac
done
[ -n "$output" ] && [ -n "\${url:-}" ] || exit 81
printf '%s\\n' "\${url##*/}" >> "$INSTALLER_REQUESTS"
cp "$INSTALLER_DOWNLOADS/\${url##*/}" "$output"
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
    await writeFile(script, assets.find(({ key }) => key === `${platform}.sh`)!.body);
    const run = (extra: Record<string, string> = {}) =>
      Bun.spawnSync({
        cmd: ['sh', script],
        env: {
          PATH: [commands, process.env.PATH].join(delimiter),
          HOME: home,
          SHELL: '/bin/bash',
          TMPDIR: root,
          INSTALLER_DOWNLOADS: downloads,
          INSTALLER_REQUESTS: requests,
          ...extra
        },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 15_000
      });
    /** The release archives the installer downloaded, without the checksum manifest. */
    const downloaded = async () =>
      existsSync(requests)
        ? (await readFile(requests, 'utf8')).split('\n').filter((name) => name && name !== 'SHA256SUMS')
        : [];
    return { root, bin, home, downloads, run, downloaded };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
};

test.skipIf(process.platform === 'win32').each(installers)(
  '%s installer rejects tampering, then upgrades and runs offline',
  async (platform) => {
    const { root, bin, home, downloads, run } = await fixture(platform);
    try {
      await writeFile(join(bin, 'stacktape'), 'previous installation');
      for (const path of stale) {
        const target = join(bin, path);
        await mkdir(join(target, '..'), { recursive: true });
        await writeFile(target, 'stale');
      }
      const manifest = await readFile(join(downloads, 'SHA256SUMS'));
      await writeFile(join(downloads, 'SHA256SUMS'), `${'0'.repeat(64)}  ${platform}.tar.gz\n`);
      const rejected = run();
      expect(rejected.exitCode).not.toBe(0);
      expect(rejected.stdout.toString()).toContain('Checksum verification failed');
      expect(await readFile(join(bin, 'stacktape'), 'utf8')).toBe('previous installation');
      expect(await readFile(join(bin, 'llm-docs/old.txt'), 'utf8')).toBe('stale');
      await writeFile(join(downloads, 'SHA256SUMS'), manifest);
      const installed = run();
      expect(installed.exitCode, installed.stdout.toString() + installed.stderr.toString()).toBe(0);
      for (const path of stale) expect(existsSync(join(bin, path)), path).toBe(false);
      expect(await readFile(join(bin, 'llm-docs/current.txt'), 'utf8')).toBe('current docs');
      for (const alias of ['stacktape', 'stp']) {
        const result = Bun.spawnSync([join(bin, alias), '--version'], { stdout: 'pipe', stderr: 'pipe' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toBe('candidate executable: --version\n');
      }
      // The installer's TMPDIR is the fixture root: an 80 MB download must not stay behind.
      expect(readdirSync(root).filter((name) => name.startsWith('stacktape_install_'))).toEqual([]);
      const shellConfig = await readFile(join(home, platform === 'alpine' ? '.profile' : '.bashrc'), 'utf8');
      expect(shellConfig).toContain(bin);
      // A GitHub Actions job gets the directory on PATH for its later steps, and shell setup is not repeated.
      const githubPath = join(root, 'github-path');
      expect(run({ GITHUB_ACTIONS: 'true', GITHUB_PATH: githubPath }).exitCode).toBe(0);
      expect(await readFile(githubPath, 'utf8')).toBe(`${bin}\n`);
      expect(await readFile(join(home, platform === 'alpine' ? '.profile' : '.bashrc'), 'utf8')).toBe(shellConfig);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000
);

test.skipIf(process.platform === 'win32')(
  'Alpine installer reports missing runtime packages before installation',
  async () => {
    const { root, bin, downloads, run } = await fixture('alpine');
    try {
      // With no downloads left, getting past the prerequisite check would fail for another reason.
      await rm(downloads, { recursive: true });
      for (const missing of ['libstdc++', 'libgcc', 'gcompat']) {
        const result = run({ INSTALLER_MISSING_RUNTIME: missing });
        expect(result.exitCode).not.toBe(0);
        expect(result.stdout.toString()).toContain(`requires these Alpine packages: ${missing}`);
        expect(result.stdout.toString()).toContain('apk add --no-cache libstdc++ libgcc gcompat');
        expect(existsSync(join(bin, 'stacktape'))).toBe(false);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
);

// macOS defaults to zsh and many developers use fish; each gets its own configuration file and syntax. Every
// installer except Alpine's (ash, `.profile` only) carries its own copy of the shell setup, so each is run.
const shells = [
  { shell: '/bin/zsh', file: '.zshrc', line: (bin: string) => `export PATH="${bin}:$PATH"` },
  { shell: '/usr/bin/fish', file: '.config/fish/config.fish', line: (bin: string) => `fish_add_path ${bin}` }
];
test
  .skipIf(process.platform === 'win32')
  .each(
    installers
      .filter((installer) => installer !== 'alpine')
      .flatMap((installer) => shells.map((entry) => ({ installer, ...entry })))
  )('$installer installer adds the directory to PATH for $shell', async ({ installer, shell, file, line }) => {
  const { root, bin, home, run } = await fixture(installer);
  try {
    await mkdir(join(home, file, '..'), { recursive: true });
    await writeFile(join(home, file), '# customer shell\n');
    const result = run({ SHELL: shell });
    expect(result.exitCode, result.stdout.toString() + result.stderr.toString()).toBe(0);
    expect(await readFile(join(home, file), 'utf8')).toContain(line(bin));
    expect(await readFile(join(home, '.bashrc'), 'utf8')).toBe('# customer shell\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// A visitor may copy the installer for the other architecture, for instance when the website guesses Apple silicon for
// an Intel Mac. Every Linux and macOS installer installs the build the machine's processor runs.
test.skipIf(process.platform === 'win32').each([
  { installer: 'linux', machine: { processor: 'aarch64' }, expected: 'linux-arm.tar.gz' },
  { installer: 'linux-arm', machine: { processor: 'x86_64' }, expected: 'linux.tar.gz' },
  { installer: 'macos', machine: { processor: 'arm64', appleSilicon: true }, expected: 'macos-arm.tar.gz' },
  { installer: 'macos-arm', machine: { processor: 'x86_64' }, expected: 'macos.tar.gz' },
  // A Rosetta shell on Apple silicon reports x86_64; the native build is still the right one.
  { installer: 'macos-arm', machine: { processor: 'x86_64', appleSilicon: true }, expected: 'macos-arm.tar.gz' }
])(
  '$installer installer on $machine.processor (Apple silicon: $machine.appleSilicon) installs $expected',
  async ({ installer, machine, expected }) => {
    const { root, bin, run, downloaded } = await fixture(installer, machine);
    try {
      const result = run();
      expect(result.exitCode, result.stdout.toString() + result.stderr.toString()).toBe(0);
      expect(await downloaded()).toEqual([expected]);
      expect(existsSync(join(bin, 'stacktape'))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000
);

test.skipIf(process.platform === 'win32')('a Linux installer refuses a processor without a build', async () => {
  const { root, bin, run, downloaded } = await fixture('linux', { processor: 'armv7l' });
  try {
    const result = run();
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout.toString()).toContain('Stacktape has no Linux build for the armv7l processor.');
    expect(await downloaded()).toEqual([]);
    expect(existsSync(join(bin, 'stacktape'))).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
