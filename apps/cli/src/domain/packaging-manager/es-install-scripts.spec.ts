import { describe, expect, test } from 'bun:test';
import { getProjectDependencyInstallScript } from './es-install-scripts';

describe('project dependency install command', () => {
  test('uses the exact pnpm version declared by the project', () => {
    expect(
      getProjectDependencyInstallScript({
        packageManager: 'pnpm',
        installType: 'CI',
        packageManagerDeclaration: 'pnpm@9.15.4+sha512.deadbeef',
        lockfile: "lockfileVersion: '9.0'\n"
      })
    ).toEqual(['pnpm', 'dlx', 'pnpm@9.15.4', 'install', '--frozen-lockfile']);
  });

  test('uses pnpm 8 for its unambiguous v6 lockfile when package.json has no declaration', () => {
    expect(
      getProjectDependencyInstallScript({
        packageManager: 'pnpm',
        installType: 'normal',
        lockfile: "lockfileVersion: '6.0'\n"
      })
    ).toEqual(['pnpm', 'dlx', 'pnpm@8.15.9', 'install']);
  });

  test('keeps the installed package manager for current or unknown lockfile formats', () => {
    expect(
      getProjectDependencyInstallScript({
        packageManager: 'pnpm',
        installType: 'normal',
        lockfile: "lockfileVersion: '9.0'\n"
      })
    ).toEqual(['pnpm', 'install']);
  });

  test('does not change other package managers', () => {
    expect(
      getProjectDependencyInstallScript({ packageManager: 'npm', installType: 'CI', lockfile: 'not relevant' })
    ).toEqual(['npm', 'ci']);
  });
});
