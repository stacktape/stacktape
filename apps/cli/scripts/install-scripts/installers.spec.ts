import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import * as tar from 'tar';
import { prepareInstallAssets } from '../publish-install-scripts';
import { generateReleaseChecksums } from '../release/checksums';

const installers = ['linux', 'linux-arm', 'alpine', 'macos', 'macos-arm'];
const stale = [
  'llm-docs/old.txt',
  'ai-docs/old.txt',
  'compiled-cli.js.map',
  'pack/old',
  'nixpacks/old',
  'session-manager-plugin/old'
];

const fixture = async (platform: string) => {
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
    await tar.c({ gzip: true, file: join(downloads, `${platform}.tar.gz`), cwd: payload }, ['stacktape', 'llm-docs']);
    await generateReleaseChecksums({ directory: downloads });
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
          ...extra
        },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 15_000
      });
    return { root, bin, home, downloads, run };
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
      const shellConfig = await readFile(join(home, platform === 'alpine' ? '.profile' : '.bashrc'), 'utf8');
      expect(shellConfig).toContain(bin);
      expect(run().exitCode).toBe(0);
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
