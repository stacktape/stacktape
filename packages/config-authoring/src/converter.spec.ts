import { describe, expect, test } from 'bun:test';
import { convertTypescriptToYaml, convertYamlToTypescript } from './converter.js';
import { Bucket, defineConfig } from './index.js';
import { parseYaml } from './yaml.js';

describe('configuration conversion', () => {
  test('one converter produces dependency-ordered TypeScript for CLI and Console', () => {
    const typescript = convertYamlToTypescript(`
resources:
  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      connectTo:
        - uploads
      environment:
        OUTPUT: $Format('{}-output', $ResourceParam('uploads', 'name'))
  uploads:
    type: bucket
`);

    expect(typescript.indexOf('const uploads = new Bucket')).toBeLessThan(
      typescript.indexOf('const worker = new LambdaFunction')
    );
    expect(typescript).toContain("$CfFormat('{}-output', $ResourceParam('uploads', 'name'))");
    expect(typescript).toContain('connectTo: [uploads]');
  });

  test('TypeScript classes become plain YAML without leaking authoring-only fields', () => {
    const yaml = convertTypescriptToYaml(`
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const uploads = new Bucket({ versioning: true });
  return { projectName: 'converter-smoke', variables: { answer: 'yes' }, resources: { uploads } };
});
`);
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

    expect(() => convertTypescriptToYaml(config)).toThrow(
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

    expect(() => convertTypescriptToYaml(config)).toThrow(
      'Cannot convert resource transforms from TypeScript to YAML (CloudFormation resources: `UploadsBucket`).'
    );
  });

  test('refuses to discard a final transform that YAML cannot represent', () => {
    const config = defineConfig(() => ({
      resources: {},
      finalTransform: (template) => template
    }));

    expect(() => convertTypescriptToYaml(config)).toThrow(
      'Cannot convert a final template transform from TypeScript to YAML.'
    );
  });
});
