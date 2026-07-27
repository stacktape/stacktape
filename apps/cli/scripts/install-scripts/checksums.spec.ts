import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PUBLISHED_INSTALL_ASSET_FILES } from '../publish-install-scripts';

const shellInstallers = ['linux.sh', 'linux-arm.sh', 'alpine.sh', 'macos.sh', 'macos-arm.sh'];

const evaluateShellChecksumGate = async (content: string, version: string) => {
  const start = content.indexOf('checksum_required_for_version() {');
  const end = content.indexOf('\n}\nchecksum_required=false', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const functionSource = content.slice(start, end + '\n}'.length);
  const gitBashPath = 'C:\\Program Files\\Git\\bin\\bash.exe';
  if (process.platform === 'win32' && !existsSync(gitBashPath)) {
    // The release workflow runs this function under /bin/sh. On Windows, where no POSIX sh is available,
    // still regression-test the declared cutoff; bash -n is exercised separately when available.
    expect(functionSource).toContain('core_version=$' + '{candidate%%-*}');
    expect(functionSource).toContain('[ "$patch" -ge 1 ]');
    const match = /required starting with (\d+)\.(\d+)\.(\d+)/.exec(content);
    expect(match).not.toBeNull();
    const cutoff = match!.slice(1).map(Number);
    const normalized = version.replace(/^[vV]/, '').split(/[-+]/, 1)[0];
    const parts = normalized.split('.');
    if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
      return 'true';
    }
    const parsed = parts.map(Number);
    for (let index = 0; index < cutoff.length; index++) {
      if (parsed[index] !== cutoff[index]) {
        return parsed[index] > cutoff[index] ? 'true' : 'false';
      }
    }
    return 'true';
  }
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-installer-version-gate-'));
  const scriptPath = join(directory, 'gate.sh');
  await writeFile(
    scriptPath,
    `#!/bin/sh\nset -eu\n${functionSource}\nif checksum_required_for_version "$1"; then printf true; else printf false; fi\n`
  );
  try {
    const shell = process.platform === 'win32' ? gitBashPath : 'sh';
    const shellScriptPath =
      process.platform === 'win32'
        ? scriptPath.replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`).replaceAll('\\', '/')
        : scriptPath;
    const result = Bun.spawnSync({ cmd: [shell, shellScriptPath, version], stdout: 'pipe', stderr: 'pipe' });
    expect(result.exitCode).toBe(0);
    return result.stdout.toString();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

const evaluatePowerShellChecksumGate = async (content: string, version: string) => {
  const start = content.indexOf('$NormalizedVersion =');
  const end = content.indexOf('\n}', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const gate = content.slice(start, end + '\n}'.length);
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-installer-version-gate-'));
  const scriptPath = join(directory, 'gate.ps1');
  await writeFile(
    scriptPath,
    `$Version = $args[0]\n${gate}\n$ChecksumRequired.ToString().ToLowerInvariant() | Write-Host -NoNewline\n`
  );
  try {
    const result = Bun.spawnSync({
      cmd: ['pwsh', '-NoProfile', '-File', scriptPath, version],
      stdout: 'pipe',
      stderr: 'pipe'
    });
    expect(result.exitCode).toBe(0);
    return result.stdout.toString();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

describe('published install scripts', () => {
  test.each(shellInstallers)('%s verifies its release archive before extraction', async (fileName) => {
    const content = await readFile(join(import.meta.dir, fileName), 'utf8');

    expect(content).toContain('/SHA256SUMS');
    expect(content).toContain('expected_checksum=');
    expect(content).toContain('actual_checksum=');
    expect(content).toContain('Checksum verification failed');
    expect(content.indexOf('Checksum verification failed')).toBeLessThan(content.indexOf('tar -xzf'));
    expect(await evaluateShellChecksumGate(content, '3.7.0')).toBe('false');
    expect(await evaluateShellChecksumGate(content, 'v3.7.0')).toBe('false');
    expect(await evaluateShellChecksumGate(content, '3.7.1-rc.1')).toBe('true');
    expect(await evaluateShellChecksumGate(content, '3.7.1')).toBe('true');
    expect(await evaluateShellChecksumGate(content, '4.0.0')).toBe('true');
    expect(await evaluateShellChecksumGate(content, 'latest')).toBe('true');
    expect(await evaluateShellChecksumGate(content, '3.7')).toBe('true');
  });

  test('Windows verifies its release archive before expansion', async () => {
    const content = await readFile(join(import.meta.dir, 'windows.ps1'), 'utf8');

    expect(content).toContain('/SHA256SUMS');
    expect(content).toContain('Get-FileHash -Path $ZipFilePath -Algorithm SHA256');
    expect(content).toContain('Checksum verification failed');
    expect(content.indexOf('Checksum verification failed')).toBeLessThan(content.indexOf('Expand-Archive'));
    expect(content).toContain("$ChecksumRequired = $ParsedVersion -ge [version]'3.7.1'");
    expect(content).toContain('if ($ChecksumRequired)');
    expect(await evaluatePowerShellChecksumGate(content, '3.7.0')).toBe('false');
    expect(await evaluatePowerShellChecksumGate(content, 'v3.7.0')).toBe('false');
    expect(await evaluatePowerShellChecksumGate(content, '3.7.1-rc.1')).toBe('true');
    expect(await evaluatePowerShellChecksumGate(content, '3.7.1')).toBe('true');
    expect(await evaluatePowerShellChecksumGate(content, '4.0.0')).toBe('true');
    expect(await evaluatePowerShellChecksumGate(content, 'latest')).toBe('true');
  });

  test('publishes only required installer assets, never adjacent tests', () => {
    expect(PUBLISHED_INSTALL_ASSET_FILES).toEqual([
      '_data.json',
      'alpine.sh',
      'linux-arm.sh',
      'linux.sh',
      'macos-arm.sh',
      'macos.sh',
      'windows.ps1'
    ]);
    expect(PUBLISHED_INSTALL_ASSET_FILES.some((fileName) => fileName.endsWith('.spec.ts'))).toBe(false);
  });
});
