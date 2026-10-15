import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { startMiniStack } from '@stacktape/ministack/fixture';
// oxlint-disable-next-line import/no-unassigned-import
import './offline-preload';
import { createFamilyProject, describeStackResources, runSourceCli, writeProjectFiles } from './harness';

// Replace only the external scanner. Deploy, stack refresh, upload and the Console report run in the source CLI.
test('security inventory follows the deployed version after create and update, and is reused on unchanged deploy', async () => {
  const out = await mkdtemp(join(tmpdir(), 'stp-security-deploy-'));
  const ministack = await startMiniStack({ label: 'security-deploy' });
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  const s3 = new S3Client(ministack.clientConfig());
  try {
    const project = await createFamilyProject({
      familyName: 'security-inventory',
      out,
      ministack,
      securityScanningEnabled: true
    });
    const scannerPath = join(project.directory, 'trivy.cjs');
    let deployed = false;
    try {
      await writeFile(
        scannerPath,
        `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.copyFileSync('scanner-input.json', args[args.indexOf('--output') + 1]);
`,
        { mode: 0o755 }
      );
      let previousKey: string | undefined;
      for (const step of ['create', 'update', 'unchanged'] as const) {
        await writeProjectFiles(project, {
          // The update changes the bucket, so it deploys a new release; the unchanged step repeats it.
          'stacktape.yml': {
            resources: { bucket: { type: 'bucket', properties: { versioning: step !== 'create' } } }
          },
          'scanner-input.json': {
            bomFormat: 'CycloneDX',
            specVersion: '1.6',
            components: [
              {
                type: 'library',
                name: 'express',
                version: step === 'create' ? '4.0.0' : '5.0.0',
                purl: `pkg:npm/express@${step === 'create' ? '4.0.0' : '5.0.0'}`,
                'bom-ref': 'express'
              }
            ]
          }
        });
        const result = await runSourceCli({ project, step, ministack, scannerPath });
        expect(result.timedOut).toBe(false);
        expect(result.exitCode, result.tail).toBe(0);
        deployed = true;
        const stack = (await cloudFormation.send(new DescribeStacksCommand({ StackName: project.stackName })))
          .Stacks![0]!;
        const version = stack.Outputs!.find(({ OutputKey }) => OutputKey === 'StpDeploymentVersion')!.OutputValue!;
        const call = project.controlPlane.calls.filter(({ procedure }) => procedure === 'recordSecurityReport').at(-1);
        expect(call).toBeDefined();
        const input = call!.input as { inventory: { bucket: string; key: string }; invocationId: string };
        const expectedKey = step === 'unchanged' ? previousKey! : `security-inventory/${version}.json`;
        expect(input.inventory.key).toBe(expectedKey);
        const stored = await s3.send(new GetObjectCommand({ Bucket: input.inventory.bucket, Key: expectedKey }));
        const document = JSON.parse(await stored.Body!.transformToString());
        expect(document.metadata.component.version).toBe(step === 'unchanged' ? 'v000002' : version);
        expect(document.components[0].version).toBe(step === 'create' ? '4.0.0' : '5.0.0');
        const objects = await s3.send(
          new ListObjectsV2Command({ Bucket: input.inventory.bucket, Prefix: 'security-inventory/' })
        );
        expect(objects.Contents!.map(({ Key }) => Key).toSorted()).toEqual(
          step === 'create'
            ? ['security-inventory/v000001.json']
            : ['security-inventory/v000001.json', 'security-inventory/v000002.json']
        );
        const operation = project.controlPlane.calls
          .filter(({ procedure }) => procedure === 'reportEvent')
          .map(({ input: operationInput }) => operationInput as { invocationId: string; deploymentVersion?: string })
          .findLast(({ invocationId, deploymentVersion }) => invocationId === input.invocationId && deploymentVersion);
        expect(operation?.deploymentVersion).toBe(version);
        previousKey = expectedKey;
      }
      expect(project.controlPlane.unexpectedProcedures).toEqual([]);
    } finally {
      try {
        if (deployed) {
          const deleted = await runSourceCli({ project, step: 'delete', ministack });
          expect(deleted.exitCode, deleted.tail).toBe(0);
          expect(await describeStackResources(cloudFormation, project.stackName)).toBeUndefined();
        }
      } finally {
        await project.close();
      }
    }
  } finally {
    cloudFormation.destroy();
    s3.destroy();
    try {
      await ministack.stop();
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  }
}, 240_000);
