/**
 * The offline deploy loop: the source CLI deploys each family of the table to one MiniStack container, applies a
 * meaningful update, redeploys unchanged input and deletes the stack, while the real AWS SDK observes the effects on
 * the emulator (code version and configuration, retained data, delivery, absence after delete). No real AWS, no
 * profile, no inherited credentials; every HTTP request outside loopback is refused by the preload.
 *
 * Run through `pnpm --filter @stacktape/cli run test:ministack:deploy`, which builds the self-contained service
 * Lambda the emulator's local Node runtime needs and restores the normal helper artifacts afterwards.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetFunctionConfigurationCommand, InvokeCommand } from '@aws-sdk/client-lambda';
import { CloudFormationClient, type StackResourceSummary } from '@aws-sdk/client-cloudformation';
import { parseYaml } from '../../src/utils/yaml';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { getCfTemplateS3Key } from '../../src/domain/deployment-artifact-manager/artifact-names';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
// oxlint-disable-next-line import/no-unassigned-import
import './offline-preload';
import {
  absenceProbes,
  createEffectClients,
  destroyEffectClients,
  families,
  type EffectClients,
  type EffectContext
} from './families';
import {
  cliRoot,
  createFamilyProject,
  describeStackFailure,
  describeStackResources,
  getStackTemplate,
  resourceSnapshot,
  writeStackEvidence,
  runSourceCli,
  writeProjectFiles,
  type DeployStep
} from './harness';

const STEPS: DeployStep[] = ['create', 'update', 'unchanged', 'delete'];
const LIFECYCLE_STEPS: DeployStep[] = ['create', 'update', 'unchanged', 'diff', 'rollback', 'delete'];
const out = join(cliRoot, '.stacktape', 'ministack', new Date().toISOString().replaceAll(/[:.]/g, '-'));

type FamilyReport = {
  family: string;
  outcome: 'passed' | 'failed' | 'skipped';
  reason?: string;
  steps: Array<{ step: DeployStep; ms: number; checks: string[] }>;
};
const report: { image?: string; imageId?: string; fixtureStartupMs?: number; families: FamilyReport[] } = {
  families: []
};

let ministack: MiniStack;
let clients: EffectClients;
let cloudFormation: CloudFormationClient;

beforeAll(async () => {
  await assert.rejects(fetch('https://sts.amazonaws.com/'), /Tests cannot access external network target/);
  const helpers = await readdir(join(cliRoot, '__stacktape-dist', 'dev', 'helper-lambdas')).catch(() => []);
  assert.ok(
    helpers.some((file) => /^stacktapeServiceLambda-.+\.zip$/.test(file)),
    'Build the helper Lambdas first: pnpm --filter @stacktape/cli run test:ministack:deploy does it.'
  );
  await mkdir(out, { recursive: true });
  ministack = await startMiniStack({ label: 'deploy-loop', applicationAutoScaling: true });
  report.image = ministack.image;
  report.imageId = ministack.imageId;
  report.fixtureStartupMs = ministack.startupMs;
  clients = createEffectClients(ministack);
  cloudFormation = new CloudFormationClient(ministack.clientConfig());
}, 180_000);

afterAll(async () => {
  // Whatever fails while closing clients or saving logs, the emulator is stopped and the report is written.
  try {
    destroyEffectClients(clients);
    cloudFormation?.destroy();
    await writeFile(join(out, 'ministack.log'), ministack?.logs() ?? '');
  } catch (error) {
    console.error(error);
  } finally {
    try {
      await ministack?.stop();
    } finally {
      await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
      const rows = report.families.map(({ family, outcome, steps }) => ({
        family,
        outcome,
        ...Object.fromEntries(steps.map(({ step, ms }) => [step, `${(ms / 1000).toFixed(1)}s`]))
      }));
      console.log(`MiniStack ${report.imageId} started in ${report.fixtureStartupMs} ms; report in ${out}`);
      console.table(rows);
    }
  }
});

describe('offline deploy loop against MiniStack', () => {
  for (const family of families) {
    const run = family.knownGap ? test.skip : test;
    run(
      family.knownGap ? `${family.name} (known gap: ${family.knownGap})` : family.name,
      async () => {
        const familyReport: FamilyReport = { family: family.name, outcome: 'failed', steps: [] };
        report.families.push(familyReport);
        const project = await createFamilyProject({ familyName: family.name, out, ministack });
        try {
          let previous: StackResourceSummary[] | undefined;
          let previousTemplate: string | undefined;
          for (const step of family.name === 'bucket-queue-table-function' ? LIFECYCLE_STEPS : STEPS) {
            const version = step === 'create' || step === 'rollback' ? 1 : 2;
            if (step === 'create' || step === 'update') {
              await writeProjectFiles(project, { 'stacktape.yml': family.config(version), ...family.files(version) });
            }
            const lookups = (resources: StackResourceSummary[]) => ({
              physical: (logicalId: string) => {
                const id = resources.find((resource) => resource.LogicalResourceId === logicalId)?.PhysicalResourceId;
                assert.ok(id, `the stack has no ${logicalId}`);
                return id;
              },
              physicalOfType: (type: string) =>
                resources.flatMap((resource) =>
                  resource.ResourceType === type && resource.PhysicalResourceId ? [resource.PhysicalResourceId] : []
                )
            });
            if (step === 'delete' && family.beforeDelete && previous) {
              await family.beforeDelete({
                endpoint: ministack.endpoint,
                stackName: project.stackName,
                deploymentBucket: project.deploymentBucket,
                resources: previous,
                clients,
                ...lookups(previous)
              });
            }
            if (step === 'rollback') {
              assert.ok(previous);
              const deploymentBucket = project.deploymentBucket;
              const storedTemplate = await clients.s3.send(
                new GetObjectCommand({ Bucket: deploymentBucket, Key: getCfTemplateS3Key('v000001') })
              );
              const oldTemplate = parseYaml(await storedTemplate.Body!.transformToString()) as CloudFormationTemplate;
              const oldFunction = oldTemplate.Resources.HandlerFunction as { Properties: { Code: { S3Key: string } } };
              const oldKey = oldFunction.Properties.Code.S3Key;
              const archive = await clients.s3.send(new GetObjectCommand({ Bucket: deploymentBucket, Key: oldKey }));
              const bytes = await archive.Body!.transformToByteArray();
              await clients.s3.send(new DeleteObjectCommand({ Bucket: deploymentBucket, Key: oldKey }));
              try {
                const refused = await runSourceCli({ project, step, ministack, logName: 'rollback-missing-artifact' });
                assert.notEqual(refused.exitCode, 0, 'rollback accepted a version whose function archive was removed');
                assert.ok(!refused.timedOut, 'missing-artifact rollback hung');
                assert.match(refused.tail, /cannot be restored/);
                assert.ok(refused.tail.includes(oldKey), 'the error did not identify the missing archive');
                assert.equal(
                  await getStackTemplate(cloudFormation, project.stackName),
                  previousTemplate,
                  'missing-artifact rollback changed the stack'
                );
              } finally {
                await clients.s3.send(new PutObjectCommand({ Bucket: deploymentBucket, Key: oldKey, Body: bytes }));
              }

              const bucket = lookups(previous).physical('BucketBucket');
              await clients.s3.send(
                new PutObjectCommand({ Bucket: bucket, Key: 'probe-state', Body: 'changed-since-v1' })
              );
              await clients.s3.send(
                new PutObjectCommand({ Bucket: bucket, Key: 'added-since-v1', Body: 'remove-on-rollback' })
              );
              const manifestKey = 'bucket-sync-manifest/v000001.json';
              const savedManifest = await clients.s3.send(
                new GetObjectCommand({ Bucket: deploymentBucket, Key: manifestKey })
              );
              const manifestBody = await savedManifest.Body!.transformToString();
              await clients.s3.send(
                new PutObjectCommand({
                  Bucket: deploymentBucket,
                  Key: manifestKey,
                  Body: JSON.stringify({ [bucket]: [{ key: 'probe-state', versionId: 'removed-object-version' }] })
                })
              );
              try {
                const partial = await runSourceCli({ project, step, ministack, logName: 'rollback-content-warning' });
                assert.equal(
                  partial.exitCode,
                  0,
                  `bucket restore failure turned a completed rollback into failure: ${partial.tail}`
                );
                assert.ok(!partial.timedOut, 'rollback hung after content restore failed');
                assert.match(partial.tail, /Could not restore bucket-synced content/);
                assert.match(
                  await getStackTemplate(cloudFormation, project.stackName),
                  /StpDeploymentVersion:\s*\n\s*Value: v000004/
                );
                const functionName = lookups(previous).physical('HandlerFunction');
                assert.equal(
                  (await clients.lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName })))
                    .MemorySize,
                  256
                );
                const invoked = await clients.lambda.send(
                  new InvokeCommand({ FunctionName: functionName, Payload: Buffer.from('{}') })
                );
                assert.equal(invoked.FunctionError, undefined);
                assert.equal(JSON.parse(Buffer.from(invoked.Payload!).toString()).body, 'ministack-v1');
                const unrestored = await clients.s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'probe-state' }));
                assert.equal(await unrestored.Body!.transformToString(), 'changed-since-v1');
              } finally {
                await clients.s3.send(
                  new PutObjectCommand({ Bucket: deploymentBucket, Key: manifestKey, Body: manifestBody })
                );
              }
            }
            if (step === 'diff') {
              // A CI deploy that would delete the table must stop for confirmation before anything is uploaded.
              const withoutTable = family.config(2) as {
                resources: Record<string, { properties?: { connectTo?: string[] } }>;
              };
              delete withoutTable.resources.table;
              const handler = withoutTable.resources.handler.properties!;
              handler.connectTo = handler.connectTo!.filter((name) => name !== 'table');
              await writeProjectFiles(project, { 'stacktape.yml': withoutTable });
              const unconfirmed = await runSourceCli({
                project,
                step: 'update',
                ministack,
                confirm: false,
                logName: 'unconfirmed-table-removal'
              });
              assert.notEqual(unconfirmed.exitCode, 0, 'an unconfirmed deploy deleted the table');
              assert.ok(!unconfirmed.timedOut, 'the unconfirmed deploy hung');
              assert.match(unconfirmed.tail, /CONFIRMATION_REQUIRED/);
              assert.match(unconfirmed.tail, /table/);
              assert.equal(
                await getStackTemplate(cloudFormation, project.stackName),
                previousTemplate,
                'the unconfirmed deploy changed the stack'
              );
              // Version 1 plus a FIFO queue: SQS can only create a FIFO queue under a new name.
              const proposed = family.config(1) as { resources: { queue: { properties: Record<string, unknown> } } };
              proposed.resources.queue.properties.fifoEnabled = true;
              await writeProjectFiles(project, { 'stacktape.yml': proposed });
            }
            // The unchanged redeploy still records a release because the stack syncs bucket content. The final rollback
            // counts back from v000004 (the partial rollback below) to v000001.
            const result = await runSourceCli({
              project,
              step,
              ministack,
              ...(step === 'rollback' ? { rollbackTarget: ['--rollbackSteps', '3'] } : {})
            });
            const checks: string[] = [];
            familyReport.steps.push({ step, ms: result.ms, checks });
            if (result.exitCode !== 0 || result.timedOut) {
              const failure = await describeStackFailure(cloudFormation, project.stackName);
              throw new Error(
                `${family.name} ${step} ${result.timedOut ? 'timed out' : `exited ${result.exitCode}`}; log: ${result.logPath}\n${failure}\n${result.tail}`
              );
            }
            if (step === 'delete') {
              expect(await describeStackResources(cloudFormation, project.stackName)).toBeUndefined();
              for (const resource of previous ?? []) {
                const probe = absenceProbes[resource.ResourceType ?? ''];
                if (!probe || !resource.PhysicalResourceId) continue;
                await assert.rejects(
                  probe(clients, ministack.endpoint, resource.PhysicalResourceId),
                  (error) => /NotFound|NoSuchBucket|NonExistentQueue|does not exist|not exist|404/i.test(String(error)),
                  `${resource.LogicalResourceId} still exists after delete`
                );
                checks.push(`${resource.LogicalResourceId} absent`);
              }
              // The CLI created the deployment bucket outside the stack, so the delete removes it after the stack.
              await assert.rejects(
                absenceProbes['AWS::S3::Bucket']!(clients, ministack.endpoint, project.deploymentBucket),
                (error) => /NotFound|NoSuchBucket|404/i.test(String(error)),
                'the deployment bucket still exists after delete'
              );
              checks.push('deployment bucket absent');
              family.assertDeleted?.({
                stackName: project.stackName,
                controlPlaneCalls: project.controlPlane.calls,
                checks
              });
              continue;
            }
            const resources = await describeStackResources(cloudFormation, project.stackName);
            assert.ok(resources, `the stack is missing after ${step}`);
            await writeStackEvidence({ cloudFormation, logs: clients.logs, s3: clients.s3, project, step, resources });
            if (previous) {
              for (const resource of resources) {
                const prior = previous.find((candidate) => candidate.LogicalResourceId === resource.LogicalResourceId);
                // A changed task definition is a new revision with a new ARN, on AWS as well; the service moves to it.
                const revised = step === 'update' && resource.ResourceType === 'AWS::ECS::TaskDefinition';
                if (prior && !revised) {
                  assert.equal(
                    resource.PhysicalResourceId,
                    prior.PhysicalResourceId,
                    `${resource.LogicalResourceId} was replaced by the ${step} step`
                  );
                }
              }
              checks.push('physical IDs preserved');
            }
            const template = await getStackTemplate(cloudFormation, project.stackName);
            if (step === 'diff') {
              assert.ok(
                (result.changeSummary?.updates ?? 0) > 0,
                'diff did not report the proposed configuration update'
              );
              assert.ok(
                result.resourceChanges
                  ?.find(({ resourceName }) => resourceName === 'queue')
                  ?.willReplace.some((label) => label.endsWith('(SQS::Queue)')),
                `diff did not report the queue replacement CloudFormation planned: ${JSON.stringify(result.resourceChanges)}`
              );
              assert.equal(template, previousTemplate, 'diff changed the deployed template');
              assert.deepEqual(resourceSnapshot(resources), resourceSnapshot(previous ?? []), 'diff changed resources');
              checks.push('diff leaves the deployed template and resources untouched');
            }
            if (step === 'rollback') {
              assert.match(template, /StpDeploymentVersion:\s*\n\s*Value: v000005/, 'rollback records a new version');
              checks.push(
                'content restore failure warns after a successful v000004 rollback; retry restores v000001 as v000005'
              );
            }
            if (step === 'unchanged') {
              // Nothing changed, so the deploy takes the fast path, updates nothing and plans no CloudFormation change.
              assert.equal(result.changeSummary, undefined, 'unchanged input planned a CloudFormation deployment');
              assert.ok(
                result.packagedWorkloads?.every((workload) => workload.skipped),
                'unchanged input repackaged a workload'
              );
              // The CLI's own report is not the proof: the stack must hold exactly the same resources and template.
              assert.deepEqual(
                resourceSnapshot(resources),
                resourceSnapshot(previous ?? []),
                'the unchanged redeploy changed the stack resources'
              );
              assert.equal(template, previousTemplate ?? '', 'the unchanged redeploy changed the stack template');
              checks.push('no planned changes, packaging skipped, identical resources and template');
            }
            const context: EffectContext = {
              step,
              version,
              endpoint: ministack.endpoint,
              stackName: project.stackName,
              deploymentBucket: project.deploymentBucket,
              resources,
              clients,
              controlPlaneCalls: project.controlPlane.calls,
              checks,
              ...lookups(resources)
            };
            await family.assertEffects(context);
            if (family.name === 'bucket-queue-table-function' && step === 'create') {
              const bucket = context.physical('BucketBucket');
              const saved = await clients.s3.send(
                new GetObjectCommand({
                  Bucket: context.deploymentBucket,
                  Key: 'bucket-sync-manifest/v000001.json'
                })
              );
              const manifest = JSON.parse(await saved.Body!.transformToString());
              const current = await clients.s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'probe-state' }));
              assert.ok(current.VersionId, 'the synced object has no version');
              assert.deepEqual(manifest, { [bucket]: [{ key: 'probe-state', versionId: current.VersionId }] });
              checks.push('deploy saves the synced bucket manifest with real object version IDs');
            }
            if (step === 'rollback') {
              await assert.rejects(
                clients.s3.send(
                  new GetObjectCommand({ Bucket: context.physical('BucketBucket'), Key: 'added-since-v1' })
                ),
                /NoSuchKey/
              );
              checks.push('bucket manifest restores the old object version and removes added content');
            }
            previous = resources;
            previousTemplate = template;
          }
          expect(project.controlPlane.unexpectedProcedures).toEqual([]);
          familyReport.outcome = 'passed';
        } finally {
          await project.close();
        }
      },
      600_000
    );
  }
});

/** The stack boundary deliberately fails; artifact discovery and deletion remain real SDK operations. */
describe('failed deployment artifacts', () => {
  for (const { failureType, stillRunning, name } of [
    { failureType: 'STACK', stillRunning: false, name: 'a STACK failure cleans the failed version' },
    {
      failureType: 'STACK_MONITORING',
      stillRunning: false,
      name: 'a STACK_MONITORING failure retains artifacts while the outcome is uncertain'
    },
    {
      failureType: 'STACK',
      stillRunning: true,
      name: 'a failure reported while CloudFormation still updates retains artifacts the stack uses'
    }
  ] as const) {
    test(name, async () => {
      const { awsSdkManager } = await import('../../src/utils/aws-sdk-manager');
      const { deploymentArtifactManager } = await import('../../src/domain/deployment-artifact-manager');
      const { stackManager } = await import('../../src/domain/cloudformation-stack-manager');
      const { operationReporter } = await import('../../src/app/operation-manager');
      const { performFullDeploy } = await import('../../src/commands/deploy');
      const { ExpectedError } = await import('../../src/utils/errors');
      const { getCfTemplateS3Key } = await import('../../src/domain/deployment-artifact-manager/artifact-names');
      const { CreateBucketCommand, PutObjectCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const account = ministack.account();
      const s3 = new S3Client(ministack.clientConfig(account));
      const bucket = `t06-artifacts-${account.accountId}`;
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        const liveKey = getCfTemplateS3Key('v000002');
        const failedKey = getCfTemplateS3Key('v000003');
        for (const Key of [liveKey, failedKey]) await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: Key }));
        awsSdkManager.init({
          credentials: account.credentials,
          region: 'eu-west-1',
          endpoint: ministack.endpoint
        });
        operationReporter.setSilentMode(true);
        stackManager.existingStackDetails = {
          StackName: 'artifact-failure',
          CreationTime: new Date(),
          StackStatus: 'UPDATE_COMPLETE',
          stackOutput: { StpDeploymentVersion: 'v000002' }
        };
        deploymentArtifactManager.previousObjects = [];
        deploymentArtifactManager.successfullyCreatedObjects = [];
        deploymentArtifactManager.deploymentBucketName = bucket;
        await deploymentArtifactManager.loadPreviousBucketObjects(bucket, 'update');
        const failure = new ExpectedError(
          failureType,
          'Injected deployment failure',
          undefined,
          stillRunning ? { stackOperationStillRunning: true } : undefined
        );
        await expect(
          performFullDeploy({
            deploymentArtifacts: deploymentArtifactManager,
            stack: {
              rollsBackOnFailure: true,
              getTemplateBeforeReplacing: () => undefined,
              stackActionType: 'update',
              createStack: async () => {
                throw new Error('The stack exists.');
              },
              deployStack: async () => {
                throw failure;
              }
            },
            tui: { info: () => {}, warn: () => {} }
          })
        ).rejects.toBe(failure);
        const keys = ((await s3.send(new ListObjectsV2Command({ Bucket: bucket }))).Contents ?? [])
          .map(({ Key }) => Key)
          .toSorted();
        expect(keys).toEqual(failureType === 'STACK' && !stillRunning ? [liveKey] : [liveKey, failedKey].toSorted());
      } finally {
        s3.destroy();
      }
    });
  }
});

test('repairing UPDATE_FAILED removes abandoned attempts while retaining the deployed archive and previous version', async () => {
  const { synthesizeFixture } = await import('../characterization/synthesis-fixture');
  const { deploymentArtifactManager } = await import('../../src/domain/deployment-artifact-manager');
  const { stackManager } = await import('../../src/domain/cloudformation-stack-manager');
  const { deleteObsoleteArtifacts, performFullDeploy } = await import('../../src/commands/deploy');
  const { buildLambdaS3Key } = await import('../../src/domain/deployment-artifact-manager/artifact-names');
  const { CreateBucketCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
  const account = ministack.account();
  const s3 = new S3Client(ministack.clientConfig(account));
  const bucket = `t06-repair-${account.accountId}`;
  const configPath = join(out, 'repair-config.yml');
  await writeFile(configPath, 'resources: {}\n');
  try {
    await synthesizeFixture({ configPath, workingDir: out, localAws: ministack.clientConfig(account) });
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    const previous = buildLambdaS3Key('handler', 'v000002', 'previous');
    const abandoned = buildLambdaS3Key('handler', 'v000003', 'abandoned');
    const deployed = buildLambdaS3Key('handler', 'v000003', 'deployed');
    const template = getCfTemplateS3Key('v000003');
    for (const Key of [previous, abandoned, deployed, template]) {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: Key }));
    }
    stackManager.existingStackDetails = {
      StackName: 'artifact-repair',
      CreationTime: new Date(),
      StackStatus: 'UPDATE_FAILED',
      stackOutput: { StpDeploymentVersion: 'v000002' }
    };
    deploymentArtifactManager.deploymentBucketName = bucket;
    deploymentArtifactManager.previousObjects = [];
    deploymentArtifactManager.previousImages = [];
    deploymentArtifactManager.successfullyCreatedObjects = [];
    deploymentArtifactManager.successfullyUploadedImages = [];
    deploymentArtifactManager.previouslyUploadedS3KeysUsedInDeployment = [deployed];
    deploymentArtifactManager.previouslyUploadedImageTagsUsedInDeployment = [];
    await deploymentArtifactManager.loadPreviousBucketObjects(bucket, 'update');
    await performFullDeploy({
      deploymentArtifacts: deploymentArtifactManager,
      stack: {
        rollsBackOnFailure: false,
        getTemplateBeforeReplacing: () => undefined,
        stackActionType: 'update',
        createStack: async () => {
          throw new Error('The stack exists.');
        },
        deployStack: async () => ({ warningMessages: [] })
      },
      tui: { info: () => {}, warn: () => {} }
    });
    await deleteObsoleteArtifacts({ deploymentArtifacts: deploymentArtifactManager, fixedFailedUpdate: true });
    const keys = ((await s3.send(new ListObjectsV2Command({ Bucket: bucket }))).Contents ?? [])
      .map(({ Key }) => Key)
      .toSorted();
    expect(keys).toEqual([previous, deployed, template].toSorted());
    expect(
      await (await s3.send(new GetObjectCommand({ Bucket: bucket, Key: deployed }))).Body!.transformToString()
    ).toBe(deployed);
  } finally {
    s3.destroy();
  }
}, 60_000);

// Shared resources reuse the real stack adapter, rather than a second in-memory CloudFormation implementation.
test('shared-stack upgrades preserve ownership, customer data and newer contracts', async () => {
  const { SharedResourceStackManager } = await import('../../src/domain/shared-resource-stack-manager');
  const { AwsCloudFormationStacks } = await import('../../src/aws/cloudformation-stacks');
  const { GetQueueAttributesCommand, ReceiveMessageCommand, SendMessageCommand } = await import('@aws-sdk/client-sqs');
  const sdk = new CloudFormationClient(ministack.clientConfig());
  const cf = new AwsCloudFormationStacks({
    createClient: () => sdk,
    getErrorHandler: () => (error) => {
      throw error;
    }
  });
  const stackName = `t06-shared-${Date.now()}`;
  const roleArn = 'arn:aws:iam::000000000000:role/shared-deployment';
  const manager = new SharedResourceStackManager({
    adapter: {
      get: async (name) => {
        const details = await cf.getDetails(name);
        // Deliberately inject stored-role metadata: MiniStack accepts RoleARN on create but omits it in DescribeStacks.
        // All stack templates, parameters, resource updates and queue effects still use the real adapter and emulator.
        return details && name === `${stackName}-role` ? { ...details, RoleARN: roleArn } : (details ?? undefined);
      },
      create: ({ stackName, template, parameters, tags, roleArn }) =>
        cf.createSharedStack(template, { StackName: stackName, Parameters: parameters, Tags: tags, RoleARN: roleArn }),
      update: ({ stackName, template, parameters, tags }) =>
        cf.updateSharedStack(template, { StackName: stackName, Parameters: parameters, Tags: tags })
    },
    pollIntervalMs: 50,
    maxWaitMs: 20_000
  });
  const requirement = (contractVersion: number, visibility: string) => ({
    kind: 'queue',
    ownershipKey: 'customer-owned-queue',
    contractVersion,
    stackName,
    parameters: { Visibility: visibility },
    beforeCreate: async () => {},
    template: {
      Parameters: { Visibility: { Type: 'String' } },
      Resources: {
        Queue: { Type: 'AWS::SQS::Queue' as const, Properties: { VisibilityTimeout: { Ref: 'Visibility' } } }
      },
      Outputs: {
        ResourceKind: { Value: 'queue' },
        OwnershipKey: { Value: 'customer-owned-queue' },
        ContractVersion: { Value: String(contractVersion) }
      }
    }
  });
  try {
    const foreignName = `${stackName}-foreign`;
    await cf.create({ Resources: { Queue: { Type: 'AWS::SQS::Queue' } } }, { StackName: foreignName });
    await expect(manager.ensure({ ...requirement(1, '60'), stackName: foreignName })).rejects.toMatchObject({
      code: 'SHARED_STACK_FOREIGN'
    });
    expect((await cf.getDetails(foreignName))?.Outputs).toEqual([]);
    expect((await cf.getDetails(foreignName))?.stackOutput).toEqual({});
    expect((await manager.ensure(requirement(1, '60'))).action).toBe('create');
    const [queue] = await cf.getResources(stackName);
    assert.ok(queue.PhysicalResourceId);
    const queueUrl = new URL(new URL(queue.PhysicalResourceId).pathname, ministack.endpoint).href;
    await clients.sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: 'customer-data' }));
    expect((await manager.ensure(requirement(2, '90'))).action).toBe('upgrade');
    expect((await cf.getResources(stackName))[0].PhysicalResourceId).toBe(queue.PhysicalResourceId);
    expect((await clients.sqs.send(new ReceiveMessageCommand({ QueueUrl: queueUrl }))).Messages?.[0]?.Body).toBe(
      'customer-data'
    );
    expect((await manager.ensure(requirement(1, '60'))).action).toBe('reuse');
    expect(
      (
        await clients.sqs.send(
          new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['VisibilityTimeout'] })
        )
      ).Attributes?.VisibilityTimeout
    ).toBe('90');
    expect((await cf.getDetails(stackName))?.stackOutput.ContractVersion).toBe('2');
    await expect(manager.ensure({ ...requirement(2, '90'), ownershipKey: 'another-customer' })).rejects.toMatchObject({
      code: 'SHARED_STACK_FOREIGN'
    });
    await expect(
      manager.ensure({ ...requirement(3, '120'), roleArn: 'arn:aws:iam::000000000000:role/different' })
    ).rejects.toMatchObject({ code: 'SHARED_STACK_ROLE_MISMATCH' });
    expect((await cf.getDetails(stackName))?.stackOutput.ContractVersion).toBe('2');
    expect((await manager.ensure({ ...requirement(2, '90'), roleArn })).action).toBe('reuse');
    const withRole = (version: number, visibility: string) => ({
      ...requirement(version, visibility),
      stackName: `${stackName}-role`,
      roleArn
    });
    expect((await manager.ensure(withRole(1, '60'))).action).toBe('create');
    expect((await manager.ensure({ ...withRole(1, '60'), roleArn: undefined })).action).toBe('reuse');
    for (const requestedRole of [undefined, 'arn:aws:iam::000000000000:role/other']) {
      await expect(manager.ensure({ ...withRole(2, '90'), roleArn: requestedRole })).rejects.toMatchObject({
        code: 'SHARED_STACK_ROLE_MISMATCH'
      });
      expect((await cf.getDetails(`${stackName}-role`))?.stackOutput.ContractVersion).toBe('1');
    }
    const [roleQueue] = await cf.getResources(`${stackName}-role`);
    expect((await manager.ensure(withRole(2, '90'))).action).toBe('upgrade');
    expect((await cf.getResources(`${stackName}-role`))[0].PhysicalResourceId).toBe(roleQueue.PhysicalResourceId);
    const roleQueueUrl = new URL(new URL(roleQueue.PhysicalResourceId!).pathname, ministack.endpoint).href;
    expect(
      (
        await clients.sqs.send(
          new GetQueueAttributesCommand({ QueueUrl: roleQueueUrl, AttributeNames: ['VisibilityTimeout'] })
        )
      ).Attributes?.VisibilityTimeout
    ).toBe('90');
    const mergeParameters = ({ existing }: { existing: Record<string, string> }) => existing;
    expect((await manager.ensure({ ...requirement(2, ''), mergeParameters })).action).toBe('reuse');
    await expect(
      manager.ensure({
        ...requirement(2, ''),
        mergeParameters: () => {
          throw new Error('conflict');
        }
      })
    ).rejects.toMatchObject({ code: 'SHARED_STACK_PARAMETER_MERGE_FAILED' });
    expect(await manager.ensureAll([requirement(2, '90'), requirement(2, '90')])).toHaveLength(1);
    await expect(
      manager.ensureAll([requirement(2, '90'), { ...requirement(2, '90'), ownershipKey: 'other' }])
    ).rejects.toMatchObject({ code: 'SHARED_STACK_DEFINITION_CONFLICT' });
  } finally {
    await cf.delete(`${stackName}-role`, {});
    await cf.delete(`${stackName}-foreign`, {});
    await cf.delete(stackName, {});
    sdk.destroy();
  }
}, 60_000);

// CloudFormation fails a change set that contains no changes instead of completing it empty.
test('a preview without changes is empty rather than an endless wait', async () => {
  const { AwsCloudFormationStacks } = await import('../../src/aws/cloudformation-stacks');
  const sdk = new CloudFormationClient(ministack.clientConfig());
  // Each poll asks for a client, so a regression ends in a failed test instead of an endless wait.
  let pollUntil = Infinity;
  const cf = new AwsCloudFormationStacks({
    createClient: () => {
      if (Date.now() > pollUntil) throw new Error('Still polling the change set.');
      return sdk;
    },
    getErrorHandler: () => (error) => {
      throw error;
    }
  });
  const stackName = `t06-preview-${Date.now()}`;
  const template = { Resources: { Queue: { Type: 'AWS::SQS::Queue' as const } } };
  try {
    await cf.create(template, { StackName: stackName });
    for (const deadline = Date.now() + 20_000; (await cf.getDetails(stackName))?.StackStatus !== 'CREATE_COMPLETE';) {
      assert.ok(Date.now() < deadline, 'the preview stack was not created');
      await Bun.sleep(100);
    }
    pollUntil = Date.now() + 15_000;
    const preview = await cf.createChangeSet({
      StackName: stackName,
      ChangeSetName: `${stackName}-unchanged`,
      TemplateBody: JSON.stringify(template)
    });
    expect(preview.changes).toEqual([]);
  } finally {
    pollUntil = Infinity;
    await cf.delete(stackName, {});
    sdk.destroy();
  }
}, 60_000);
