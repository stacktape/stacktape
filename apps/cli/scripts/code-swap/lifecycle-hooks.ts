import { readFile } from 'node:fs/promises';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { z } from 'zod';
import { awsClientConfig, createAwsClientContext } from '../../src/aws/context';
import { acquireLock, recoverLock, removeLock, tableGoneDuringDelete } from './operation-lock';
import { taskTableProtection } from './permissions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { runSchema } from './benchmark-run';
import { incompleteHistoryVersions, readReleaseRecord, type SwapRecord } from './release-record';
import { getCfTemplateS3Key, getStpTemplateS3Key } from '../../src/domain/deployment-artifact-manager/artifact-names';

export const TABLE_LOGICAL_ID = 'StacktapeCodeSwapTable';
let held: { ddb: DynamoDBClient; table: string; invocationId: string; stackName: string; stackId: string } | undefined;
let teardownRequested = false;
let teardownAccepted = false;
let interrupted = false;
let pendingPreparation: Promise<unknown> | undefined;
export let recoveredOperation = false;
export let releaseRecordAtStart: SwapRecord | undefined;
export let hadCodeSwapTable = false;
let versionFloor = 'v000000';
export const benchmarkNextVersion = (version: string) =>
  version > versionFloor ? version : `v${String(Number(versionFloor.slice(1)) + 1).padStart(6, '0')}`;

export const benchmarkOperation = async (operation: 'deploy' | 'rollback' | 'delete') => {
  const { templateManager } = await import('../../src/domain/template-manager');
  const table = templateManager.oldTemplate.Resources[TABLE_LOGICAL_ID];
  hadCodeSwapTable = Boolean(table);
  if (!table) return; // Initial opt-in is an ordinary, unlocked full deployment.
  const tableName = z.object({ TableName: z.string() }).parse(table.Properties).TableName;
  const { globalStateManager: global } = await import('../../src/app/global-state-manager');
  const { awsSdkManager: aws } = await import('../../src/utils/aws-sdk-manager');
  const { applicationManager } = await import('../../src/app/application-manager');
  if (
    global.targetAwsAccount.awsAccountId !== '597581086285' ||
    global.region !== 'eu-west-1' ||
    global.args.awsAccount !== 'stacktape-e2e' ||
    !global.targetStack.projectName.startsWith('v4swap-')
  )
    throw new Error('Benchmark lock target mismatch.');
  const ddb = new DynamoDBClient(
    awsClientConfig(
      createAwsClientContext({
        credentials: aws.credentialsProvider,
        region: aws.region,
        plugins: [...aws.plugins]
      })
    )
  );
  const { stackManager: stack } = await import('../../src/domain/cloudformation-stack-manager');
  const recovery = process.env.STP_CODE_SWAP_BENCH_RECOVER;
  try {
    if (recovery) {
      const { tuiManager } = await import('../../src/app/tui-manager');
      tuiManager.warn(
        `Recovering ${recovery}. Make sure that invocation no longer runs and every AWS change it started has finished. An interrupted swap will be repaired with an image deploy.`
      );
      if (
        !global.args.autoConfirmOperation &&
        !(await tuiManager.promptConfirm({
          message: 'Has that invocation stopped and have its AWS changes finished?',
          defaultValue: false
        }))
      )
        throw new Error('Recovery was not confirmed.');
      await recoverLock(ddb, tableName, recovery);
      recoveredOperation = true;
    }
    await acquireLock(ddb, tableName, {
      invocationId: global.invocationId,
      operation,
      startedAt: new Date().toISOString()
    });
  } catch (error) {
    if (tableGoneDuringDelete(error, operation, stack.existingStackDetails.StackStatus)) return;
    throw error;
  }
  held = {
    ddb,
    table: tableName,
    invocationId: global.invocationId,
    stackName: global.targetStack.stackName,
    stackId: stack.existingStackDetails.StackId
  };
  teardownRequested = operation === 'delete';
  teardownAccepted =
    operation === 'delete' && ['DELETE_IN_PROGRESS', 'DELETE_FAILED'].includes(stack.existingStackDetails.StackStatus);
  applicationManager.registerCleanUpHook(async (outcome) => {
    interrupted ||= Boolean(outcome?.interrupted);
  });
  const record = await readReleaseRecord(ddb, tableName);
  if (record?.HistoryVersion && stack.lastVersion && record.HistoryVersion > stack.lastVersion)
    throw new Error(
      'Another release finished while this operation initialized. Run the command again with fresh stack state.'
    );
  releaseRecordAtStart = record;
  versionFloor =
    [record?.Committed?.Revision, record?.Proposed?.Revision, record?.HistoryVersion]
      .filter((version): version is string => Boolean(version && /^v\d{6}$/.test(version)))
      .sort()
      .at(-1) ?? versionFloor;
  // SIGKILL can land between the ordinary history uploads and our final record write. Such an attempt is not a release.
  const incomplete = incompleteHistoryVersions(record);
  if (incomplete.length) {
    const { deploymentArtifactManager: artifacts } = await import('../../src/domain/deployment-artifact-manager');
    const keys = incomplete.flatMap((version) => [
      getCfTemplateS3Key(version),
      getStpTemplateS3Key(version),
      `fast-release/${version}.json`
    ]);
    await artifacts.deleteObjectsFromDeploymentBucket(keys);
    artifacts.previousObjects = artifacts.previousObjects.filter(({ s3Key }) => !keys.includes(s3Key));
  }
};

export const benchmarkTrackPreparation = (work: Promise<unknown>) => {
  pendingPreparation = work;
};

// The entrypoint calls this after the ordinary cleanup hooks (which run concurrently) have all finished.
export const benchmarkFinish = async () => {
  if (interrupted) return;
  if (pendingPreparation) await Promise.allSettled([pendingPreparation]);
  pendingPreparation = undefined;
  if (!held) return;
  const lock = held;
  await removeLock(lock.ddb, lock.table, lock.invocationId).catch((error: unknown) => {
    if (!(teardownAccepted && error instanceof Error && error.name === 'ResourceNotFoundException')) throw error;
  });
  held = undefined;
};

export const benchmarkTeardownAccepted = <T>(result: T, stackName?: string): T => {
  if (teardownRequested && held && (stackName === held.stackName || stackName === held.stackId))
    teardownAccepted = true;
  return result;
};

export const benchmarkTemplate = async (template: CloudFormationTemplate) => {
  const path = process.env.STP_CODE_SWAP_BENCH_RUN;
  if (!path) return;
  const run = runSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  if (!run.phase4) return;
  if (run.optOut) teardownRequested = true;
  const arn = `arn:aws:dynamodb:eu-west-1:597581086285:table/${run.table}`;
  if (!run.optOut)
    template.Resources[TABLE_LOGICAL_ID] = {
      Type: 'AWS::DynamoDB::Table',
      DependsOn: cfLogicalNames.ecsTaskRole('api'),
      Properties: {
        TableName: run.table,
        BillingMode: 'PAY_PER_REQUEST',
        KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
        Tags: [{ Key: 'code-swap-benchmark-owner', Value: run.owner }]
      }
    };
  protectTaskRole(template, arn);
  if (run.optOut) return;
  const service = template.Resources[cfLogicalNames.ecsService('api', false)];
  service.DependsOn = [
    ...new Set([
      ...(Array.isArray(service.DependsOn) ? service.DependsOn : service.DependsOn ? [service.DependsOn] : []),
      TABLE_LOGICAL_ID
    ])
  ];
};

// Keep the Deny on the retained role through opt-out. Removing it early would expose a still-running app's table.
const protectTaskRole = (template: CloudFormationTemplate, arn: string) => {
  const roleName = cfLogicalNames.ecsTaskRole('api');
  const definitionName = cfLogicalNames.ecsTaskDefinition('api');
  const serviceName = cfLogicalNames.ecsService('api', false);
  const definition = template.Resources[definitionName];
  const service = template.Resources[serviceName];
  const taskRole = z.object({ TaskRoleArn: z.unknown().optional() }).parse(definition?.Properties ?? {}).TaskRoleArn;
  const taskDefinition = z
    .object({ TaskDefinition: z.unknown().optional() })
    .parse(service?.Properties ?? {}).TaskDefinition;
  if (
    JSON.stringify(taskRole) !== JSON.stringify({ 'Fn::GetAtt': [roleName, 'Arn'] }) ||
    JSON.stringify(taskDefinition) !== JSON.stringify({ Ref: definitionName }) ||
    Object.entries(template.Resources).some(
      ([name, resource]) =>
        (resource.Type === 'AWS::ECS::TaskDefinition' && name !== definitionName) ||
        (resource.Type === 'AWS::ECS::Service' && name !== serviceName)
    )
  )
    throw new Error('The benchmark requires its single API service and protected managed task role.');
  const role = template.Resources[cfLogicalNames.ecsTaskRole('api')];
  if (!role || role.Type !== 'AWS::IAM::Role') throw new Error('Missing owned benchmark task role.');
  const properties = z
    .object({ Policies: z.array(z.unknown()).optional() })
    .loose()
    .parse(role.Properties);
  const policies = (properties.Policies ?? []).filter(
    (policy) =>
      !policy ||
      typeof policy !== 'object' ||
      !('PolicyName' in policy) ||
      policy.PolicyName !== 'code-swap-table-protection'
  );
  policies.push({
    PolicyName: 'code-swap-table-protection',
    PolicyDocument: {
      Version: '2012-10-17',
      Statement: taskTableProtection(arn)
    }
  });
  role.Properties = { ...role.Properties, Policies: policies };
};

export const benchmarkRollbackTemplate = (template: CloudFormationTemplate) => {
  if (held && !template.Resources[TABLE_LOGICAL_ID]) {
    teardownRequested = true;
    protectTaskRole(template, `arn:aws:dynamodb:eu-west-1:597581086285:table/${held.table}`);
  }
};
