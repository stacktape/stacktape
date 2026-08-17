import { expect, test } from 'bun:test';
import { getInstallDependenciesCommand } from './package-manager-install';

test('pnpm explicitly executes the allowlisted native package lifecycle scripts', () => {
  const command = getInstallDependenciesCommand({
    dependencies: [{ name: '@scope/native-addon', version: '1.2.3' }],
    packageManager: 'pnpm'
  });

  expect(command).toContain('onlyBuiltDependencies:');
  expect(command).toContain('pnpm add @scope/native-addon@1.2.3');
  expect(command).toContain('pnpm --dir "node_modules/@scope/native-addon" run --if-present preinstall');
  expect(command).toContain('pnpm --dir "node_modules/@scope/native-addon" run --if-present install');
  expect(command).toContain('pnpm --dir "node_modules/@scope/native-addon" run --if-present postinstall');
});
