import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { LambdaFunction, JsBundleLambdaPackaging, defineConfig } from '@stacktape/config-authoring';
import { synthesizeFixture } from './synthesis-fixture';

/**
 * Node.js names a CommonJS file `.cjs` and an ES module `.mjs`, and TypeScript mirrors them as `.cts` and `.mts`. A
 * project that keeps CommonJS handlers beside a `"type": "module"` manifest uses exactly these names, and the importer
 * already writes them into generated configs, so the CLI has to accept every one of them as a `js-bundle` entry file.
 */
const ENTRY_EXTENSIONS = ['cjs', 'cts', 'mjs', 'mts'] as const;

const createConfig = () =>
  defineConfig(() => ({
    resources: Object.fromEntries(
      ENTRY_EXTENSIONS.map((extension) => [
        `handler${extension}`,
        new LambdaFunction({
          packaging: new JsBundleLambdaPackaging({ entryfilePath: `./src/handler.${extension}` })
        })
      ])
    )
  }))({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    cliArgs: {} as any,
    command: 'synth',
    awsProfile: '',
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  });

describe('Node.js entry-file extensions', () => {
  test('.cjs, .cts, .mjs and .mts entry files synthesize as Node.js functions', async () => {
    const template = await synthesizeFixture({
      compiledConfig: createConfig(),
      workingDir: join(import.meta.dir, 'fixtures', 'node-entry-extensions')
    });
    const runtimes = ENTRY_EXTENSIONS.map((extension) => {
      const resource = template.Resources[cfLogicalNames.lambda(`handler${extension}`)] as
        | { Type: string; Properties: { Runtime?: string } }
        | undefined;
      return `${extension}: ${resource?.Type ?? 'missing'} ${resource?.Properties.Runtime ?? ''}`;
    });
    expect(runtimes).toEqual(ENTRY_EXTENSIONS.map((extension) => `${extension}: AWS::Lambda::Function nodejs24.x`));
  });
});
