import { expect, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  defineConfig,
  EmailSender,
  HostingBucket,
  MultiContainerWorkload,
  StacktapeImageBuildpackPackaging,
  type CompiledStacktapeConfig
} from '@stacktape/config-authoring';
import { synthesizeFixture } from './synthesis-fixture';

test('local API and UI synthesize support infrastructure without a second data plane', async () => {
  const input = process.env.STACKTAPE_TEST_COMPILED_CONFIG;
  const compiledConfig: CompiledStacktapeConfig = input
    ? JSON.parse(await readFile(input, 'utf8'))
    : defineConfig(() => {
        const sender = new EmailSender({ identity: 'example.com', manageIdentity: false });
        const api = new MultiContainerWorkload({
          containers: [
            {
              name: 'api',
              packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/api.ts' }),
              environment: { PORT: '3000' }
            }
          ],
          resources: { cpu: 0.5, memory: 1024 },
          connectTo: [sender]
        });
        const ui = new HostingBucket({ uploadDirectoryPath: './dist', dev: { command: 'node index.ts' } });
        return { resources: { api, ui, sender } };
      })({
        projectName: 'characterization',
        stage: 'baseline',
        region: 'eu-west-1',
        command: 'dev',
        awsProfile: '',
        cliArgs: {}
      });

  const template = await synthesizeFixture({
    compiledConfig,
    command: 'dev',
    workingDir: process.env.STACKTAPE_TEST_CONFIG_DIRECTORY || join(import.meta.dir, 'fixtures', 'dense-application')
  });
  const resources = Object.values(template.Resources);
  expect(resources.length).toBeGreaterThan(0);
  const allowedTypes = new Set([
    'AWS::IAM::Role',
    'AWS::S3::Bucket',
    'AWS::S3::BucketPolicy',
    'AWS::ECR::Repository',
    'AWS::Logs::LogGroup',
    'AWS::Lambda::Function',
    'AWS::Events::Rule',
    'AWS::Lambda::Permission',
    'AWS::CloudFormation::CustomResource'
  ]);
  for (const [id, resource] of Object.entries(template.Resources)) {
    expect(allowedTypes.has(resource.Type), `${id}: ${resource.Type}`).toBe(true);
    if (resource.Type === 'AWS::Lambda::Function') expect(id).toBe('StacktapeServiceLambdaCustomResourceFunction');
  }
  // IAM and custom-resource payloads must not reference the VPC omitted for local workloads.
  expect(JSON.stringify(template)).not.toContain('"Ref":"StpVpc"');
  const output = process.env.STACKTAPE_TEST_SUPPORT_TEMPLATE;
  if (output) await writeFile(output, JSON.stringify(template));
});
