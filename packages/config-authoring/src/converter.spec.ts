import { describe, expect, test } from 'bun:test';
import { convertAuthoringConfigToYaml } from './converter.js';
import { Bucket, defineConfig } from './index.js';
import { parseYaml } from './yaml.js';

describe('configuration conversion', () => {
  test('TypeScript classes become plain YAML without leaking authoring-only fields', () => {
    const config = defineConfig(() => ({
      projectName: 'converter-smoke',
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
});
