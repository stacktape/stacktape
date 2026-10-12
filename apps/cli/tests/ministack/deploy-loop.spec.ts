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
const withoutDeploymentVersion = (template: string) =>
  template.replace(/(StpDeploymentVersion:\s*\n\s*Value: )v\d+/, '$1<version>');
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
  ministack = await startMiniStack({ label: 'deploy-loop' });
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
                resources: previous,
                clients,
                ...lookups(previous)
              });
            }
            if (step === 'rollback') {
              assert.ok(previous);
              const deploymentBucket = lookups(previous).physical('StpDeploymentBucket');
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
            }
            if (step === 'diff') {
              const proposed = family.config(1);
              await writeProjectFiles(project, { 'stacktape.yml': proposed });
            }
            const result = await runSourceCli({ project, step, ministack });
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
              continue;
            }
            const resources = await describeStackResources(cloudFormation, project.stackName);
            assert.ok(resources, `the stack is missing after ${step}`);
            await writeStackEvidence({ cloudFormation, logs: clients.logs, s3: clients.s3, project, step, resources });
            if (previous) {
              for (const resource of resources) {
                const prior = previous.find((candidate) => candidate.LogicalResourceId === resource.LogicalResourceId);
                if (prior) {
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
              assert.equal(template, previousTemplate, 'diff changed the deployed template');
              assert.deepEqual(resourceSnapshot(resources), resourceSnapshot(previous ?? []), 'diff changed resources');
              checks.push('diff leaves the deployed template and resources untouched');
            }
            if (step === 'rollback') {
              assert.match(template, /StpDeploymentVersion:\s*\n\s*Value: v000004/, 'rollback records a new version');
              checks.push('v000001 redeployed as v000004');
            }
            if (step === 'unchanged') {
              assert.deepEqual(
                result.changeSummary,
                { creates: 0, updates: 0, deletes: 0, replacements: 0, dangerousChanges: 0 },
                'unchanged input planned resource changes'
              );
              assert.ok(
                result.packagedWorkloads?.every((workload) => workload.skipped),
                'unchanged input repackaged a workload'
              );
              // The CLI's own report is not the proof: the stack must hold exactly the same resources (no additions,
              // removals or replacements) and exactly the same template as before the redeploy.
              assert.deepEqual(
                resourceSnapshot(resources),
                resourceSnapshot(previous ?? []),
                'the unchanged redeploy changed the stack resources'
              );
              // The CLI advances its deployment-version output on every deploy by design; everything else in the
              // template must be byte-identical.
              assert.equal(
                withoutDeploymentVersion(template),
                withoutDeploymentVersion(previousTemplate ?? ''),
                'the unchanged redeploy changed the stack template'
              );
              checks.push('zero planned changes, packaging skipped, identical resources and template');
            }
            const context: EffectContext = {
              step,
              version,
              endpoint: ministack.endpoint,
              resources,
              clients,
              checks,
              ...lookups(resources)
            };
            await family.assertEffects(context);
            if (family.name === 'bucket-queue-table-function' && step === 'create') {
              const bucket = context.physical('BucketBucket');
              const saved = await clients.s3.send(
                new PutObjectCommand({ Bucket: bucket, Key: 'probe-state', Body: 'survives-update' })
              );
              const savedBucketVersion = saved.VersionId;
              assert.ok(savedBucketVersion, 'the old bucket object has no version');
              await clients.s3.send(
                new PutObjectCommand({
                  Bucket: context.physical('StpDeploymentBucket'),
                  Key: 'bucket-sync-manifest/v000001.json',
                  Body: JSON.stringify({ [bucket]: [{ key: 'probe-state', versionId: savedBucketVersion }] })
                })
              );
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
  for (const failureType of ['STACK', 'STACK_MONITORING'] as const) {
    test(`a ${failureType} failure ${failureType === 'STACK' ? 'cleans the failed version' : 'retains artifacts while the outcome is uncertain'}`, async () => {
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
        const failure = new ExpectedError(failureType, 'Injected deployment failure');
        await expect(
          performFullDeploy({
            deploymentArtifacts: deploymentArtifactManager,
            stack: {
              existingStackDetails: stackManager.existingStackDetails,
              isAutoRollbackEnabled: true,
              deployStack: async () => {
                throw failure;
              }
            },
            tui: { warn: () => {} }
          })
        ).rejects.toBe(failure);
        const keys = ((await s3.send(new ListObjectsV2Command({ Bucket: bucket }))).Contents ?? [])
          .map(({ Key }) => Key)
          .toSorted();
        expect(keys).toEqual(failureType === 'STACK' ? [liveKey] : [liveKey, failedKey].toSorted());
      } finally {
        s3.destroy();
      }
    });
  }
});

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
  const manager = new SharedResourceStackManager({
    adapter: {
      get: async (stackName) => (await cf.getDetails(stackName)) ?? undefined,
      create: ({ stackName, template, parameters, tags, roleArn }) =>
        cf.createSharedStack(template, { StackName: stackName, Parameters: parameters, Tags: tags, RoleARN: roleArn }),
      update: ({ stackName, template, parameters, tags }) =>
        cf.updateSharedStack(template, { StackName: stackName, Parameters: parameters, Tags: tags })
    },
    pollIntervalMs: 50,
    maxWaitMs: 20_000
  });
  const stackName = `t06-shared-${Date.now()}`;
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
    await cf.delete(`${stackName}-foreign`, {});
    await cf.delete(stackName, {});
    sdk.destroy();
  }
}, 60_000);
