import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import { convertYamlToTypescript } from '@stacktape/config-authoring/converter';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const convertedProject = async (yaml: string) => {
  const workingDir = await mkdtemp(join(tmpdir(), 'stacktape-config-conversion-'));
  directories.push(workingDir);
  const configPath = join(workingDir, 'stacktape.ts');
  await mkdir(join(workingDir, 'src'));
  await writeFile(join(workingDir, 'src', 'worker.ts'), 'export default async () => ({ statusCode: 200 });\n');
  await writeFile(configPath, convertYamlToTypescript(yaml));
  return { configPath, workingDir };
};

describe('converted YAML remains executable TypeScript configuration', () => {
  test('loads dependencies before their consumers and preserves nested directives, routes and scoped IAM', async () => {
    const template = await synthesizeFixture(
      await convertedProject(`
resources:
  worker:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/worker.ts
      connectTo: [uploads]
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            method: GET
            path: /output
      environment:
        OUTPUT: $CfFormat('{}-output', $ResourceParam('uploads', 'name'))
        STAGE_REGION: $Format('{}:{}', $Stage(), $Region())
        QUOTED: $Format('{}', "it's preserved")
  uploads:
    type: bucket
  api:
    type: http-api-gateway
`)
    );
    const fn = template.Resources.WorkerFunction;
    expect(fn).toMatchObject({
      Type: 'AWS::Lambda::Function',
      Properties: {
        Environment: {
          Variables: {
            OUTPUT: { 'Fn::Sub': ['${sub0}-output', { sub0: { Ref: 'UploadsBucket' } }] },
            STAGE_REGION: 'baseline:eu-west-1',
            QUOTED: "it's preserved"
          }
        }
      }
    });
    expect(Object.values(template.Resources)).toContainEqual(
      expect.objectContaining({
        Type: 'AWS::ApiGatewayV2::Route',
        Properties: expect.objectContaining({ RouteKey: 'GET /output', ApiId: { Ref: 'ApiApi' } })
      })
    );
    const role = template.Resources.WorkerRole as {
      Properties: {
        Policies: { PolicyDocument: { Statement: { Effect: string; Action: string[]; Resource: unknown[] }[] } }[];
      };
    };
    const statements = role.Properties.Policies.flatMap((policy) => policy.PolicyDocument.Statement);
    expect(statements.filter((statement) => statement.Action.some((action) => action.startsWith('s3:')))).toEqual([
      {
        Effect: 'Allow',
        Action: ['s3:ListBucket', 's3:GetBucket*'],
        Resource: [{ 'Fn::GetAtt': ['UploadsBucket', 'Arn'] }]
      },
      {
        Effect: 'Allow',
        Action: ['s3:*Object*', 's3:Abort*', 's3:*MultipartUpload*'],
        Resource: [{ 'Fn::Join': ['', [{ 'Fn::GetAtt': ['UploadsBucket', 'Arn'] }, '/*']] }]
      }
    ]);
  });
});

test.each([
  {
    name: 'firewall and custom-resource references',
    yaml: `resources:
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
        type: js-bundle
        properties:
          entryfilePath: src/worker.ts
`,
    expected: {
      site: { properties: { useFirewall: 'firewall' } },
      provisionedThing: { properties: { definitionName: 'provisioner' } }
    }
  },
  {
    name: 'context-specific references and literal recording bucket names',
    yaml: `resources:
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
        type: js-bundle
        properties:
          entryfilePath: src/worker.ts
      connectTo: [recordings, external-resource]
  recordings:
    type: bucket
`,
    expected: {
      browser: { properties: { recording: { enabled: true, bucketName: 'recordings' } } },
      runtime: { properties: { useBrowser: 'browser' } },
      api: { properties: { cdn: { edgeFunctions: { onRequest: 'edgeHandler' } } } },
      edgeHandler: { properties: { connectTo: ['recordings', 'external-resource'] } }
    }
  }
])('loads converted $name without losing reference identities', async ({ yaml, expected }) => {
  const { configPath } = await convertedProject(yaml);
  const { config } = await new ConfigResolver().loadTypescriptConfig({
    filePath: configPath,
    authoringParams: { stage: 'test', region: 'eu-west-1', cliArgs: {}, command: 'synth', awsProfile: '' }
  });
  expect(config.resources).toMatchObject(expected);
});
