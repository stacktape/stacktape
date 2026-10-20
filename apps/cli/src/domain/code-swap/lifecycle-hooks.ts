import { CliError } from '../../utils/errors';
import { capacityWithOverrides } from './ecs-budget';
import { codeSwapIntegration } from './integration';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { z } from 'zod';
import { awsClientConfig, createAwsClientContext } from '../../aws/context';
import { acquireLock, recoverLock, removeLock, tableGoneDuringDelete } from './operation-lock';
import { taskTableProtection } from './permissions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCodeSwapRun } from './configuration';
import { unsupportedReason } from './eligibility';
import { incompleteHistoryVersions, readReleaseRecord, type SwapRecord } from './release-record';
import { getCfTemplateS3Key, getStpTemplateS3Key } from '../deployment-artifact-manager/artifact-names';

export const TABLE_LOGICAL_ID = 'StacktapeCodeSwapTable';
let held:
  | {
      ddb: DynamoDBClient;
      table: string;
      invocationId: string;
      stackName: string;
      stackId: string;
      service: string;
      arn: string;
    }
  | undefined;
let teardownRequested = false;
let teardownAccepted = false;
let interrupted = false;
let pendingPreparation: Promise<unknown> | undefined;
export let recoveredOperation = false;
export let releaseRecordAtStart: SwapRecord | undefined;
export let hadCodeSwapTable = false;
let versionFloor = 'v000000';
export const codeSwapNextVersion = (version: string) =>
  version > versionFloor ? version : `v${String(Number(versionFloor.slice(1)) + 1).padStart(6, '0')}`;

export const codeSwapOperation = async (operation: 'deploy' | 'rollback' | 'delete') => {
  if (operation === 'deploy') {
    const { configManager } = await import('../config-manager');
    const { tuiManager } = await import('../../app/tui-manager');
    const workloads = configManager.allContainerWorkloads;
    for (const workload of workloads) {
      if (!('codeSwap' in workload) || !workload.codeSwap) continue;
      const reason = unsupportedReason(workload, workloads.length);
      if (reason) tuiManager.info(`Code swap skipped for ${workload.name}: ${reason}; using an image deploy.`);
      else
        tuiManager.info(
          `Code swap enabled for ${workload.name}. Old and new processes share task memory; a sudden increase can fail in-flight requests. Failed memory screens use an image deploy.`
        );
    }
  }
  const { templateManager } = await import('../template-manager');
  const table = templateManager.oldTemplate.Resources[TABLE_LOGICAL_ID];
  hadCodeSwapTable = Boolean(table);
  if (!table) return; // Initial opt-in is an ordinary, unlocked full deployment.
  const tableName = z.object({ TableName: z.string() }).parse(table.Properties).TableName;
  const { globalStateManager: global } = await import('../../app/global-state-manager');
  const { awsSdkManager: aws } = await import('../../utils/aws-sdk-manager');
  const { applicationManager } = await import('../../app/application-manager');
  const ddb = new DynamoDBClient(
    awsClientConfig(
      createAwsClientContext({
        credentials: aws.credentialsProvider,
        region: aws.region,
        plugins: [...aws.plugins]
      })
    )
  );
  const { stackManager: stack } = await import('../cloudformation-stack-manager');
  const recovery = global.args.recoverOperation ?? process.env.STP_CODE_SWAP_BENCH_RECOVER;
  try {
    if (recovery) {
      const { tuiManager } = await import('../../app/tui-manager');
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
  applicationManager.finalCleanUpHooks.push(codeSwapFinish);
  held = {
    ddb,
    table: tableName,
    invocationId: global.invocationId,
    stackName: global.targetStack.stackName,
    service: typeof table.Metadata?.CodeSwapService === 'string' ? table.Metadata.CodeSwapService : 'api',
    arn: `arn:aws:dynamodb:${global.region}:${global.targetAwsAccount.awsAccountId}:table/${tableName}`,
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
    const { deploymentArtifactManager: artifacts } = await import('../deployment-artifact-manager');
    const keys = incomplete.flatMap((version) => [
      getCfTemplateS3Key(version),
      getStpTemplateS3Key(version),
      `fast-release/${version}.json`
    ]);
    await artifacts.deleteObjectsFromDeploymentBucket(keys);
    artifacts.previousObjects = artifacts.previousObjects.filter(({ s3Key }) => !keys.includes(s3Key));
  }
};

export const codeSwapTrackPreparation = (work: Promise<unknown>) => {
  pendingPreparation = work;
};

// The entrypoint calls this after the ordinary cleanup hooks (which run concurrently) have all finished.
export const codeSwapFinish = async () => {
  if (interrupted) return;
  if (pendingPreparation) await Promise.allSettled([pendingPreparation]);
  pendingPreparation = undefined;
  await codeSwapIntegration.abortPreparation();
  if (!held) return;
  const lock = held;
  await removeLock(lock.ddb, lock.table, lock.invocationId).catch((error: unknown) => {
    if (!(teardownAccepted && error instanceof Error && error.name === 'ResourceNotFoundException')) throw error;
  });
  held = undefined;
};

export const codeSwapTeardownAccepted = <T>(result: T, stackName?: string): T => {
  if (teardownRequested && held && (stackName === held.stackName || stackName === held.stackId))
    teardownAccepted = true;
  return result;
};

export const codeSwapTemplate = async (template: CloudFormationTemplate) => {
  const run = await getCodeSwapRun();
  if (!run) return;
  if (!run.phase4) return;
  if (run.optOut) {
    const { templateManager } = await import('../template-manager');
    if (
      !process.env.STP_CODE_SWAP_BENCH_RUN &&
      !templateManager.oldTemplate.Resources[TABLE_LOGICAL_ID] &&
      !template.Resources[TABLE_LOGICAL_ID]
    )
      return;
    teardownRequested = true;
  }
  const { globalStateManager: global } = await import('../../app/global-state-manager');
  const arn = `arn:aws:dynamodb:${global.region}:${global.targetAwsAccount.awsAccountId}:table/${run.table}`;
  if (!run.optOut)
    template.Resources[TABLE_LOGICAL_ID] = {
      Type: 'AWS::DynamoDB::Table',
      DependsOn: cfLogicalNames.ecsTaskRole(run.service),
      Metadata: { CodeSwapService: run.service },
      Properties: {
        TableName: run.table,
        BillingMode: 'PAY_PER_REQUEST',
        KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
        Tags: [{ Key: 'stacktape:code-swap-owner', Value: run.owner }]
      }
    };
  const { configManager } = await import('../config-manager');
  const services = new Set([
    run.service,
    ...(run.optOut && configManager.config ? configManager.allContainerWorkloads.map((workload) => workload.name) : [])
  ]);
  for (const serviceName of services) {
    // A removed service keeps its existing Deny until CloudFormation deletes its role.
    if (run.optOut && !template.Resources[cfLogicalNames.ecsTaskDefinition(serviceName)]) continue;
    protectTaskRole(template, arn, serviceName);
  }
  if (run.optOut) return;
  const { deploymentArtifactManager: artifacts } = await import('../deployment-artifact-manager');
  const role = template.Resources[cfLogicalNames.ecsTaskRole(run.service)];
  const props = z
    .object({ Policies: z.array(z.unknown()).optional() })
    .loose()
    .parse(role.Properties);
  role.Properties = {
    ...role.Properties,
    Policies: [
      ...(props.Policies ?? []),
      {
        PolicyName: 'code-swap-runtime',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['dynamodb:GetItem'],
              Resource: arn,
              Condition: { 'ForAllValues:StringEquals': { 'dynamodb:LeadingKeys': ['release#node'] } }
            },
            {
              Effect: 'Allow',
              Action: ['dynamodb:PutItem'],
              Resource: arn,
              Condition: { 'ForAllValues:StringEquals': { 'dynamodb:LeadingKeys': ['status#node#${aws:userid}'] } }
            },
            {
              Effect: 'Allow',
              Action: ['s3:GetObject'],
              Resource: `arn:aws:s3:::${artifacts.deploymentBucketName}/code-swap/api/bundles/*`
            }
          ]
        }
      }
    ]
  };
  const definition = template.Resources[cfLogicalNames.ecsTaskDefinition(run.service)];
  const containers = z
    .array(z.object({ Environment: z.array(z.unknown()).optional() }).loose())
    .parse((definition.Properties as Record<string, unknown>)?.ContainerDefinitions);
  const app = containers[0]!;
  const { imageHasSupervisor } = codeSwapIntegration;
  if (imageHasSupervisor !== false) {
    const { configManager } = await import('../config-manager');
    const workload = configManager.allContainerWorkloads.find((item) => item.name === run.service);
    if (workload) {
      const actualService = template.Resources[cfLogicalNames.ecsService(run.service, false)];
      const actualScaling = template.Resources[cfLogicalNames.autoScalingTarget(run.service)];
      const capacity = capacityWithOverrides(
        {
          name: run.service,
          maximum: workload.scaling.maxInstances,
          minimum: workload.scaling.minInstances,
          maximumPercent: 200,
          scalingOverrides: actualScaling?.Properties
        },
        actualService?.Properties
      );
      if (capacity.reason)
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CODE_SWAP_FINAL_TEMPLATE_UNSUPPORTED',
          message: `The final template cannot run the code-swap supervisor: ${capacity.reason}`,
          hints: 'Remove codeSwap or correct the capacity transform before deploying.'
        });
    }
  }
  // A cached bundle skips the transform; a supervisor command in the image's cached template remains valid.
  if (imageHasSupervisor === false) {
    const { configManager } = await import('../config-manager');
    const container = configManager.allContainerWorkloads.find((item) => item.name === run.service)?.containers[0];
    if (container && !process.env.STP_CODE_SWAP_BENCH_RUN) {
      delete app.HealthCheck;
      app.StopTimeout = container.stopTimeout ?? 30;
    }
  }

  app.Environment = [
    ...(app.Environment ?? []).filter(
      (value) => !(value && typeof value === 'object' && 'Name' in value && value.Name === 'STP_BENCH_ROLE_ID')
    ),
    { Name: 'STP_BENCH_ROLE_ID', Value: { 'Fn::GetAtt': [cfLogicalNames.ecsTaskRole(run.service), 'RoleId'] } }
  ];
  definition.Properties = { ...definition.Properties, ContainerDefinitions: containers };
  const service = template.Resources[cfLogicalNames.ecsService(run.service, false)];
  service.DependsOn = [
    ...new Set([
      ...(Array.isArray(service.DependsOn) ? service.DependsOn : service.DependsOn ? [service.DependsOn] : []),
      TABLE_LOGICAL_ID
    ])
  ];
};

// Keep the Deny on the retained role through opt-out. Removing it early would expose a still-running app's table.
const protectTaskRole = (template: CloudFormationTemplate, arn: string, service: string) => {
  const roleName = cfLogicalNames.ecsTaskRole(service);
  const definitionName = cfLogicalNames.ecsTaskDefinition(service);
  const serviceName = cfLogicalNames.ecsService(service, false);
  const definition = template.Resources[definitionName];
  const serviceResource = template.Resources[serviceName];
  const taskRole = z.object({ TaskRoleArn: z.unknown().optional() }).parse(definition?.Properties ?? {}).TaskRoleArn;
  const taskDefinition = z
    .object({ TaskDefinition: z.unknown().optional() })
    .parse(serviceResource?.Properties ?? {}).TaskDefinition;
  if (
    JSON.stringify(taskRole) !== JSON.stringify({ 'Fn::GetAtt': [roleName, 'Arn'] }) ||
    JSON.stringify(taskDefinition) !== JSON.stringify({ Ref: definitionName })
  )
    throw new Error('Code swap requires a protected managed task role and service.');
  const role = template.Resources[cfLogicalNames.ecsTaskRole(service)];
  if (!role || role.Type !== 'AWS::IAM::Role') throw new Error('Missing managed code-swap task role.');
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

export const codeSwapRollbackTemplate = (template: CloudFormationTemplate) => {
  if (held && !template.Resources[TABLE_LOGICAL_ID]) {
    teardownRequested = true;
    protectTaskRole(template, held.arn, held.service);
  }
};
