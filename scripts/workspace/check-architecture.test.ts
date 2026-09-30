import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import type { IConfiguration } from 'dependency-cruiser';
import { checkWorkspaceArchitecture } from './check-architecture.ts';

const require = createRequire(import.meta.url);
const configuration = require('../../dependency-cruiser.config.cjs') as IConfiguration;
const withFixture = async (
  scenario: (root: string, put: (path: string, source: string) => Promise<void>) => Promise<void>
) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-architecture-'));
  const previousDirectory = process.cwd();
  const put = async (path: string, source: string) => {
    const file = join(root, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, source);
  };
  try {
    process.chdir(root);
    await scenario(root, put);
  } finally {
    process.chdir(previousDirectory);
    await rm(root, { recursive: true, force: true });
  }
};

const ruleNames = async (directory: string) =>
  (await checkWorkspaceArchitecture({ directory, configuration })).map(({ rule }) => rule.name);

test('resolves inherited aliases relative to the config that declares them', () =>
  withFixture(async (root, put) => {
    await put(
      'tsconfig.base.json',
      JSON.stringify({ compilerOptions: { paths: { '@utils/*': ['./apps/cli/src/utils/*'] } } })
    );
    await put('apps/cli/tsconfig.json', JSON.stringify({ extends: '../../tsconfig.base.json' }));
    await put(
      'apps/cli/src/main.ts',
      "import { second } from '@utils/second'; export function first() { return second(); }"
    );
    await put(
      'apps/cli/src/utils/second.ts',
      "import { first } from '../main'; export function second() { return first(); }"
    );
    const rules = await ruleNames(join(root, 'apps/cli'));
    assert.ok(rules.includes('no-cycles'));
    assert.ok(!rules.includes('workspace-imports-resolve'));
  }));

test('refuses Console UI declaration imports of the complete adapter router', () =>
  withFixture(async (root, put) => {
    await put('apps/console/api/src/router.ts', 'export interface Router { privileged: string }');
    await put(
      'apps/console/ui/src/main.ts',
      "import type { Router } from '../../api/src/router'; export type Result = Router;"
    );
    assert.ok((await ruleNames(join(root, 'apps/console/ui'))).includes('console-ui-uses-explicit-api-contracts'));
  }));

test('resolves CLI aliases and rejects a synthesis dependency on invocation state', () =>
  withFixture(async (root, put) => {
    await put(
      'apps/cli/tsconfig.json',
      JSON.stringify({ compilerOptions: { paths: { '@application-services/*': ['./src/app/*'] } } })
    );
    await put(
      'apps/cli/src/domain/calculated-stack-overview-manager/index.ts',
      "import { state } from '@application-services/global-state-manager'; export const result = state;"
    );
    await put('apps/cli/src/app/global-state-manager/index.ts', 'export const state = {};');
    assert.ok((await ruleNames(join(root, 'apps/cli'))).includes('synthesis-does-not-read-cli-global-state'));
  }));

test('resolves workspace export maps and refuses an unexported module', () =>
  withFixture(async (root, put) => {
    await put(
      'packages/capability/package.json',
      JSON.stringify({ name: '@stacktape/capability', type: 'module', exports: { './allowed': './src/allowed.ts' } })
    );
    await put('packages/capability/src/allowed.ts', 'export const value = 1;');
    await put('packages/capability/src/private.ts', 'export const value = 2;');
    await mkdir(join(root, 'apps/cli/node_modules/@stacktape'), { recursive: true });
    await symlink(
      join(root, 'packages/capability'),
      join(root, 'apps/cli/node_modules/@stacktape/capability'),
      'junction'
    );
    await put(
      'apps/cli/src/main.ts',
      "import { value } from '@stacktape/capability/allowed'; export const result = value;"
    );
    assert.deepEqual(await ruleNames(join(root, 'apps/cli')), []);
    await put(
      'apps/cli/src/main.ts',
      "import { value } from '@stacktape/capability/private'; export const result = value;"
    );
    assert.ok((await ruleNames(join(root, 'apps/cli'))).includes('workspace-imports-resolve'));
  }));

test('checks private declaration imports even when the target is built output', () =>
  withFixture(async (root, put) => {
    await put(
      'apps/cli/src/main.ts',
      "import type { Private } from '../../console/api/dist/private'; export type Result = Private;"
    );
    await put('apps/console/api/dist/private.d.ts', 'export interface Private { id: string }');
    assert.ok((await ruleNames(join(root, 'apps/cli'))).includes('public-does-not-import-private-console'));
  }));

test('allows Console router inference and rejects a browser runtime import of that router', () =>
  withFixture(async (root, put) => {
    await put(
      'apps/console/api/src/console-router.ts',
      'export interface Router { session: string } export const router = {};'
    );
    await put(
      'apps/console/ui/src/main.ts',
      "import type { Router } from '../../api/src/console-router'; export type Result = Router;"
    );
    assert.deepEqual(await ruleNames(join(root, 'apps/console/ui')), []);
    await put(
      'apps/console/ui/src/main.ts',
      "import { router } from '../../api/src/console-router'; export const result = router;"
    );
    assert.ok((await ruleNames(join(root, 'apps/console/ui'))).includes('console-ui-does-not-import-api-runtime'));
  }));

test('rejects cycles hidden behind an alias', () =>
  withFixture(async (root, put) => {
    await put(
      'apps/cli/tsconfig.json',
      JSON.stringify({ compilerOptions: { paths: { '@utils/*': ['./src/utils/*'] } } })
    );
    await put(
      'apps/cli/src/main.ts',
      "import { second } from '@utils/second'; export function first() { return second(); }"
    );
    await put(
      'apps/cli/src/utils/second.ts',
      "import { first } from '../main'; export function second() { return first(); }"
    );
    assert.ok((await ruleNames(join(root, 'apps/cli'))).includes('no-cycles'));
  }));

test('rejects an application dependency from a package while accepting the owned docs metadata', () =>
  withFixture(async (root, put) => {
    await put('apps/cli/src/main.ts', 'export const value = 1;');
    await put(
      'packages/capability/src/main.ts',
      "import { value } from '../../../apps/cli/src/main'; export const result = value;"
    );
    assert.ok((await ruleNames(join(root, 'packages/capability'))).includes('packages-do-not-import-apps'));
    await put('apps/cli/starter-projects-metadata.json', '[]');
    await put(
      'apps/docs/src/main.ts',
      "import metadata from '../../cli/starter-projects-metadata.json'; export const result = metadata;"
    );
    assert.deepEqual(await ruleNames(join(root, 'apps/docs')), []);
  }));
