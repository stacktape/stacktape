import { describe, expect, test } from 'bun:test';
import { convertAuthoringConfigToYaml, convertYamlToTypescript } from './converter.js';
import * as runtime from './index.js';
import { Bucket, defineConfig } from './index.js';
import { getConfigSettings } from './tooling.js';
import { parseYaml } from './yaml.js';

/** Evaluate converter output against this runtime; the test owns the generated source, so running it is safe. */
const evaluateGeneratedTypescript = (code: string) => {
  const javascript = new Bun.Transpiler({ loader: 'ts' })
    .transformSync(code)
    .replace(/import\s*\{([^}]*)\}\s*from\s*["']stacktape["'];?/, 'const {$1} = runtime;')
    .replace('export default', 'return');
  return new Function('runtime', javascript)(runtime) as ReturnType<typeof defineConfig>;
};

describe('configuration conversion', () => {
  test('TypeScript classes become plain YAML without leaking authoring-only fields', () => {
    const config = defineConfig({ projectName: 'converter-smoke' }, () => ({
      variables: { answer: 'yes' },
      resources: { uploads: new Bucket({ versioning: true }) }
    }));
    const yaml = convertAuthoringConfigToYaml(config);
    const converted = parseYaml<{
      projectName: string;
      variables: { answer: string };
      resources: { uploads: { type: string; properties: { versioning: boolean } } };
    }>(yaml);

    expect(converted).toEqual({
      projectName: 'converter-smoke',
      variables: { answer: 'yes' },
      resources: { uploads: { type: 'bucket', properties: { versioning: true } } }
    });
    expect(yaml).toContain('answer: "yes"');
    expect(yaml).not.toContain('transforms:');
  });

  test('never evaluates TypeScript source text', () => {
    expect(() => convertAuthoringConfigToYaml('globalThis.compromised = true' as never)).toThrow(
      'Expected an already-loaded Stacktape authoring config, not source text.'
    );
  });

  test('refuses to discard resource transforms that YAML cannot represent', () => {
    const config = defineConfig(() => ({
      resources: {
        uploads: new Bucket({
          transforms: {
            bucket: (properties) => ({ ...properties, VersioningConfiguration: { Status: 'Enabled' } })
          }
        })
      }
    }));

    expect(() => convertAuthoringConfigToYaml(config)).toThrow(
      'Cannot convert resource transforms from TypeScript to YAML (CloudFormation resources: `UploadsBucket`).'
    );
  });

  test('refuses transforms on a directly supplied authoring object too', () => {
    const config = {
      resources: {
        uploads: new Bucket({
          transforms: {
            bucket: (properties) => ({
              ...properties,
              VersioningConfiguration: { Status: 'Enabled' }
            })
          }
        })
      }
    };

    expect(() => convertAuthoringConfigToYaml(config)).toThrow(
      'Cannot convert resource transforms from TypeScript to YAML (CloudFormation resources: `UploadsBucket`).'
    );
  });

  test('refuses to discard a final transform that YAML cannot represent', () => {
    const config = defineConfig(() => ({
      resources: {},
      finalTransform: (template) => template
    }));

    expect(() => convertAuthoringConfigToYaml(config)).toThrow(
      'Cannot convert a final template transform from TypeScript to YAML.'
    );
  });

  test('YAML project settings become the defineConfig settings object and survive a round trip', () => {
    const yaml =
      'projectName: shop\nregion: eu-west-1\nresources:\n  uploads:\n    type: bucket\n    properties:\n      versioning: true\n';
    const typescript = convertYamlToTypescript(yaml);

    expect(typescript).toContain('export default defineConfig({ projectName: "shop", region: "eu-west-1" }, () => {');
    expect(typescript).not.toMatch(/return \{[^]*projectName/);
    const defined = evaluateGeneratedTypescript(typescript);
    expect(getConfigSettings(defined)).toEqual({ projectName: 'shop', region: 'eu-west-1' });
    expect(parseYaml<unknown>(convertAuthoringConfigToYaml(defined))).toEqual(parseYaml<unknown>(yaml));
  });

  test('YAML without project settings keeps the one-argument form', () => {
    const typescript = convertYamlToTypescript('resources:\n  uploads:\n    type: bucket\n');
    expect(typescript).toContain('export default defineConfig(() => {');
  });

  test('TypeScript to YAML keeps declared settings and runs the callback with them', () => {
    const seen: unknown[] = [];
    const config = defineConfig({ projectName: 'shop', region: 'eu-central-1' }, ({ projectName, region }) => {
      seen.push({ projectName, region });
      return { resources: { uploads: new Bucket({}) } };
    });

    expect(parseYaml<Record<string, unknown>>(convertAuthoringConfigToYaml(config))).toEqual({
      projectName: 'shop',
      region: 'eu-central-1',
      resources: { uploads: { type: 'bucket', properties: {} } }
    });
    expect(seen).toEqual([{ projectName: 'shop', region: 'eu-central-1' }]);
  });
});
