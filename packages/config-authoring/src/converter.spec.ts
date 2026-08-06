import { describe, expect, test } from 'bun:test';
import { convertAuthoringConfigToYaml, convertYamlToTypescript } from './converter.js';
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

  test('emits direct objects only for registered resource references', () => {
    const typescript = convertYamlToTypescript(`
resources:
  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handler.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            method: GET
            path: /
      connectTo:
        - api
        - external-resource
  api:
    type: http-api-gateway
`);

    expect(typescript.indexOf('const api = new HttpApiGateway')).toBeLessThan(
      typescript.indexOf('const handler = new LambdaFunction')
    );
    expect(typescript).toContain('httpApiGatewayName: api');
    expect(typescript).toContain('connectTo: [api, "external-resource"]');
  });

  test('recognizes resource references whose property names do not end in Name', () => {
    const typescript = convertYamlToTypescript(`
resources:
  site:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: dist
      useFirewall: firewall
  firewall:
    type: web-app-firewall
    properties:
      scope: cdn
  provisionedThing:
    type: custom-resource-instance
    properties:
      definitionName: provisioner
      resourceProperties: {}
  provisioner:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/provisioner.ts
`);

    expect(typescript).toContain('useFirewall: firewall');
    expect(typescript).toContain('definitionName: provisioner');
  });

  test('recognizes context-specific references and preserves literal AgentCore recording bucket names', () => {
    const typescript = convertYamlToTypescript(`
resources:
  browser:
    type: agentcore-browser
    properties:
      recording:
        enabled: true
        bucketName: recordings
  runtime:
    type: agentcore-runtime
    properties:
      packaging:
        type: prebuilt-image
        properties:
          image: example/runtime
      useBrowser: browser
  api:
    type: http-api-gateway
    properties:
      cdn:
        enabled: true
        edgeFunctions:
          onRequest: edgeHandler
  edgeHandler:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/edge.ts
  recordings:
    type: bucket
`);

    expect(typescript).toContain('useBrowser: browser');
    expect(typescript).toContain('onRequest: edgeHandler');
    expect(typescript).toContain('bucketName: "recordings"');
    expect(typescript.indexOf('const browser = new AgentCoreBrowser')).toBeLessThan(
      typescript.indexOf('const recordings = new Bucket')
    );
  });

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
