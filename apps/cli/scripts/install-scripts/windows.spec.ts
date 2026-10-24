import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { prepareInstallAssets } from '../publish-install-scripts';
import { generateReleaseChecksums } from '../release/checksums';

/** The archive both Windows installers must choose here: this machine's build, whichever installer runs. */
const nativeArchive = process.arch === 'arm64' ? 'windows-arm.zip' : 'windows.zip';

const installerNames = ['windows.ps1', 'windows-arm.ps1'];

/**
 * A home, a local release whose archive holds `executable` as stacktape.exe, and `run`, which runs the installer as a
 * file with the given arguments, or the documented `iex "& { $(irm ...) } init --projectDirectory 'my app'"` form.
 */
const windowsFixture = async (installerName: string, executable: { content: string; mode?: number }) => {
  const powershell = Bun.which('pwsh') ?? Bun.which('powershell');
  if (!powershell) throw new Error('The Windows installer lane requires PowerShell (pwsh or powershell) on PATH.');
  const root = await mkdtemp(join(tmpdir(), 'stacktape-windows-installer-'));
  try {
    const home = join(root, 'home');
    const bin = join(home, '.stacktape', 'bin');
    const downloads = join(root, 'downloads');
    await mkdir(bin, { recursive: true });
    await mkdir(downloads);
    const zip = new AdmZip();
    // The mode lets Expand-Archive restore an execute bit when PowerShell runs outside Windows.
    zip.addFile('stacktape.exe', Buffer.from(executable.content), '', executable.mode ?? 0o644);
    zip.addFile('llm-docs/current.txt', Buffer.from('current docs'));
    zip.addFile('session-manager-plugin/smp.exe', Buffer.from('bundled plugin bytes'));
    await writeFile(join(downloads, nativeArchive), zip.toBuffer());
    await generateReleaseChecksums({ directory: downloads });
    const installer = join(root, installerName);
    const assets = await prepareInstallAssets({ version: '4.0.0-preview.17' });
    await writeFile(installer, assets.find(({ key }) => key === installerName)!.body);
    const wrapper = join(root, 'run.ps1');
    // Run the whole installer. Substitute HTTP and persistent user PATH, keeping filesystem/hash/ZIP operations real.
    // These guards also fail if the script tries to write outside its home or fetch an unexpected URL.
    await writeFile(
      wrapper,
      `
$ErrorActionPreference = 'Stop'
Set-Variable -Name HOME -Value $env:INSTALLER_HOME -Force
$profile = Join-Path $HOME 'profile.ps1'
class Environment {
  static [string] GetEnvironmentVariable([string] $Name, [System.EnvironmentVariableTarget] $Target) {
    if ($Name -ne 'Path') { throw 'Unexpected environment read' }
    return "$env:INSTALLER_HOME\\.stacktape\\bin"
  }
  static [void] SetEnvironmentVariable([string] $Name, [string] $Value, [System.EnvironmentVariableTarget] $Target) {
    throw 'The fixture must never change the user PATH'
  }
}
function Invoke-WebRequest {
  param([string] $Uri, [string] $OutFile, [switch] $UseBasicParsing)
  if ($Uri -notmatch '^https://github.com/stacktape/stacktape/releases/download/4\\.0\\.0-preview\\.17/(${nativeArchive.replace('.', '\\.')}|SHA256SUMS)$') {
    throw "Unexpected download: $Uri"
  }
  Copy-Item (Join-Path $env:INSTALLER_DOWNLOADS ($Uri.Split('/')[-1])) $OutFile
}
# PowerShell outside Windows has no registry. Answer the installer's architecture read the way this machine's would.
if (-not $IsWindows) {
  function Get-ItemProperty {
    param([string] $Path)
    if ($Path -ne 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment') { throw "Unexpected registry read: $Path" }
    return [pscustomobject]@{ PROCESSOR_ARCHITECTURE = '${process.arch === 'arm64' ? 'ARM64' : 'AMD64'}' }
  }
}
if ($env:INSTALLER_MODE -eq 'iex') {
  # The script's text is read from disk rather than downloaded.
  iex "& { $(Get-Content -Raw $env:INSTALLER_SCRIPT) } init --projectDirectory 'my app'"
  Write-Output "still running after iex, CLI exit code $LASTEXITCODE"
} else {
  & $env:INSTALLER_SCRIPT @args
  # $? is false only when the installer itself ended with exit, as it does when run with powershell -File.
  if (-not $?) { exit $LASTEXITCODE }
}
`
    );
    const run = ({
      args = [],
      mode = 'file',
      env = {}
    }: { args?: string[]; mode?: 'file' | 'iex'; env?: Record<string, string> } = {}) =>
      Bun.spawnSync({
        cmd: [powershell, '-NoProfile', '-File', wrapper, ...args],
        env: {
          PATH: process.env.PATH,
          INSTALLER_HOME: home,
          INSTALLER_DOWNLOADS: downloads,
          INSTALLER_SCRIPT: installer,
          INSTALLER_MODE: mode,
          ...env
        },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 20_000
      });
    return { root, home, bin, downloads, run };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
};

test.each(installerNames)(
  `%s installs ${nativeArchive} on this machine, rejects tampering and upgrades the complete payload`,
  async (installerName) => {
    const { root, bin, downloads, run } = await windowsFixture(installerName, { content: 'candidate binary bytes' });
    try {
      await writeFile(join(bin, 'stacktape.exe'), 'previous installation');
      const stale = ['llm-docs/old.txt', 'ai-docs/old.txt', 'compiled-cli.js.map', 'pack/old', 'nixpacks/old'];
      for (const path of stale) {
        await mkdir(join(bin, path, '..'), { recursive: true });
        await writeFile(join(bin, path), 'stale');
      }
      const manifest = await readFile(join(downloads, 'SHA256SUMS'));
      await writeFile(join(downloads, 'SHA256SUMS'), `${'0'.repeat(64)}  ${nativeArchive}\n`);
      const rejected = run();
      expect(rejected.exitCode).not.toBe(0);
      expect(rejected.stderr.toString()).toContain('Checksum verification failed');
      expect(await readFile(join(bin, 'stacktape.exe'), 'utf8')).toBe('previous installation');
      expect(await readFile(join(bin, 'llm-docs/old.txt'), 'utf8')).toBe('stale');
      expect(existsSync(join(bin, 'stacktape.zip'))).toBe(false);
      await writeFile(join(downloads, 'SHA256SUMS'), manifest);
      const installed = run();
      expect(installed.exitCode, installed.stdout.toString() + installed.stderr.toString()).toBe(0);
      expect(installed.stdout.toString()).toContain('To get started, run:');
      for (const path of stale) expect(existsSync(join(bin, path)), path).toBe(false);
      expect(await readFile(join(bin, 'stacktape.exe'), 'utf8')).toBe('candidate binary bytes');
      expect(await readFile(join(bin, 'llm-docs/current.txt'), 'utf8')).toBe('current docs');
      expect(await readFile(join(bin, 'session-manager-plugin/smp.exe'), 'utf8')).toBe('bundled plugin bytes');
      expect(existsSync(join(bin, 'stacktape.zip'))).toBe(false);
      expect(run().exitCode).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  60_000
);

// The fake stacktape.exe is a shell script, so this runs only where PowerShell runs outside Windows.
test.skipIf(process.platform === 'win32').each(installerNames)(
  '%s runs the installed CLI with the arguments after its own, as a file and through iex',
  async (installerName) => {
    const recorder = `#!/bin/sh
for argument in "$@"; do printf 'arg=%s\\n' "$argument"; done > "$INSTALLER_CLI_RECORD"
exit 7
`;
    const { root, run } = await windowsFixture(installerName, { content: recorder, mode: 0o755 });
    try {
      const record = join(root, 'cli-record.txt');
      const expectedArguments = ['arg=init', 'arg=--projectDirectory', 'arg=my app'];

      // powershell -File windows.ps1 init ...: CI and agents see the CLI's failure.
      const asFile = run({ args: ['init', '--projectDirectory', 'my app'], env: { INSTALLER_CLI_RECORD: record } });
      expect(asFile.stdout.toString()).toContain('stacktape init --projectDirectory my app');
      expect(asFile.exitCode, asFile.stdout.toString() + asFile.stderr.toString()).toBe(7);
      expect((await readFile(record, 'utf8')).trim().split('\n')).toEqual(expectedArguments);
      await rm(record);

      // iex in the person's own PowerShell window: the window stays open whatever the CLI returns.
      const throughIex = run({ mode: 'iex', env: { INSTALLER_CLI_RECORD: record } });
      expect(throughIex.stdout.toString()).toContain('still running after iex, CLI exit code 7');
      expect(throughIex.exitCode, throughIex.stdout.toString() + throughIex.stderr.toString()).toBe(0);
      expect((await readFile(record, 'utf8')).trim().split('\n')).toEqual(expectedArguments);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  60_000
);
