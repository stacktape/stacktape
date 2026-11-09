import { CliError } from '../../utils/errors';
import { capacityWithOverrides } from './ecs-budget';
import { codeSwapIntegration } from './integration';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { HeldStackLock } from '../stack-operation-lock/lock';
import { z } from 'zod';
import { awsClientConfig, createAwsClientContext } from '../../aws/context';
import { taskTableProtection } from './permissions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCodeSwapRuns } from './configuration';
import { unsupportedReason } from './eligibility';
import { incompleteHistoryVersions, readReleaseRecord, type SwapRecord } from './release-record';
import { getCfTemplateS3Key, getStpTemplateS3Key } from '../deployment-artifact-manager/artifact-names';

export const TABLE_LOGICAL_ID = 'StacktapeCodeSwapTable';
let held:
  | {
      lock: HeldStackLock;
      services: { service: string; recordService: string }[];
      arn: string;
    }
  | undefined;
let interrupted = false;
let retainLock = false;
let mutationStarted = false;
const pendingPreparations: Promise<unknown>[] = [];
export let recoveredOperation = false;
export const releaseRecordsAtStart = new Map<string, SwapRecord | undefined>();
export let hadCodeSwapTable = false;
let versionFloor = 'v000000';
let codeSwapNextVersionFloor = versionFloor;
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
  const { deploymentArtifactManager: artifacts } = await import('../deployment-artifact-manager');
  const bucketName = artifacts.deploymentBucketName;
  // Retrying a delete: the stack is going away and may have lost its bucket and table already.
  const deleteIsRunning =
    operation === 'delete' && ['DELETE_IN_PROGRESS', 'DELETE_FAILED'].includes(stack.existingStackDetails.StackStatus);
  if (deleteIsRunning && !(await aws.s3.bucketExists({ bucketName }))) return;
  const { holdStackLock } = await import('../stack-operation-lock');
  const lock = await holdStackLock({ bucketName, operation, releaseOnExit: false });
  applicationManager.finalCleanUpHooks.push(codeSwapFinish);
  held = {
    lock,
    services: (await getCodeSwapRuns()).map(({ service, recordService }) => ({ service, recordService })),
    arn: `arn:aws:dynamodb:${global.region}:${global.targetAwsAccount.awsAccountId}:table/${tableName}`
  };
  if (lock.tookOverFrom) {
    // Its swap may be half done, and only an image deploy puts every task on known code.
    recoveredOperation = true;
    const { tuiManager } = await import('../../app/tui-manager');
    tuiManager.warn(
      `The previous ${lock.tookOverFrom.operation} (${lock.tookOverFrom.invocationId}) stopped before it finished. An interrupted swap will be repaired with an image deploy.`
    );
  }
  applicationManager.registerCleanUpHook(async (outcome) => {
    interrupted ||= Boolean(outcome?.interrupted);
  });
  for (const run of await getCodeSwapRuns()) {
    let record: SwapRecord | undefined;
    try {
      record = await readReleaseRecord(ddb, tableName, run.recordService);
    } catch (error) {
      if (deleteIsRunning && error instanceof Error && error.name === 'ResourceNotFoundException') return;
      throw error;
    }
    if (record?.HistoryVersion && stack.lastVersion && record.HistoryVersion > stack.lastVersion)
      throw new Error(
        'Another release finished while this operation initialized. Run the command again with fresh stack state.'
      );
    releaseRecordsAtStart.set(run.recordService, record);
    versionFloor =
      [record?.Committed?.Revision, record?.Proposed?.Revision, record?.HistoryVersion]
        .filter((version): version is string => Boolean(version && /^v\d{6}$/.test(version)))
        .sort()
        .at(-1) ?? versionFloor;
    versionFloor = versionFloor > codeSwapNextVersionFloor ? versionFloor : codeSwapNextVersionFloor;
    codeSwapNextVersionFloor = versionFloor;
    // SIGKILL can land between the ordinary history uploads and our final record write. Such an attempt is not a release.
    const incomplete = incompleteHistoryVersions(record);
    if (incomplete.length) {
      const keys = incomplete.flatMap((version) => [
        getCfTemplateS3Key(version),
        getStpTemplateS3Key(version),
        `fast-release/${version}.json`
      ]);
      await artifacts.deleteObjectsFromDeploymentBucket(keys);
      artifacts.previousObjects = artifacts.previousObjects.filter(({ s3Key }) => !keys.includes(s3Key));
    }
  }
};

export const codeSwapInterrupted = () => interrupted;

/**
 * Throws if another operation took over the stack lock. A swap calls it after its waits, right before it changes
 * running tasks: a paused process does not notice by itself that its lease ended.
 */
export const codeSwapConfirmLock = async () => {
  await held?.lock.confirm();
};

let repairCompleted = false;
export const codeSwapRepairCompleted = () => {
  repairCompleted = true;
};

/**
 * The lock left behind is the only record that a repair is still needed. An operation that took it over and stopped
 * before finishing leaves it to expire too, so the next one repairs instead of finding a released lock.
 */
export const leavesStackLockToExpire = (state: { recovering: boolean; repairCompleted: boolean }) =>
  state.recovering && !state.repairCompleted;

// Commands call this right before they change CloudFormation stacks or running services. An interruption before
// that point aborts any prepared swap and releases the lock; after it, the lock stays until its lease ends, and the next
// operation repairs the service.
export const codeSwapBeginMutation = () => {
  if (interrupted) throw new Error('The operation was interrupted before it changed the stack.');
  mutationStarted = true;
};

export const codeSwapTrackPreparation = (work: Promise<unknown>) => {
  pendingPreparations.push(work);
};

// The entrypoint calls this after the ordinary cleanup hooks (which run concurrently) have all finished.
export const codeSwapFinish = async () => {
  if (retainLock || (interrupted && mutationStarted)) {
    held?.lock.detach();
    return;
  }
  await Promise.allSettled(pendingPreparations);
  pendingPreparations.length = 0;
  await codeSwapIntegration.abortPreparation();
  if (leavesStackLockToExpire({ recovering: recoveredOperation, repairCompleted })) held?.lock.detach();
  else await held?.lock.release();
  held = undefined;
};

export const codeSwapTemplate = async (template: CloudFormationTemplate) => {
  const runs = await getCodeSwapRuns();
  if (!runs.length) return;
  const enabled = runs.filter((run) => !run.optOut);
  for (const run of runs) {
    if (!enabled.length) {
      const { templateManager } = await import('../template-manager');
      if (
        !process.env.STP_CODE_SWAP_BENCH_RUN &&
        !templateManager.oldTemplate.Resources[TABLE_LOGICAL_ID] &&
        !template.Resources[TABLE_LOGICAL_ID]
      )
        return;
    }
    const { globalStateManager: global } = await import('../../app/global-state-manager');
    const arn = `arn:aws:dynamodb:${global.region}:${global.targetAwsAccount.awsAccountId}:table/${run.table}`;
    if (!run.optOut)
      template.Resources[TABLE_LOGICAL_ID] = {
        Type: 'AWS::DynamoDB::Table',
        DependsOn: enabled.map((item) => cfLogicalNames.ecsTaskRole(item.service)),
        Metadata: {
          CodeSwapServices: enabled.map((item) => item.service),
          ...(runs.find((item) => item.recordService === 'node' && item.artifactService === 'api')
            ? {
                CodeSwapService: runs.find((item) => item.recordService === 'node' && item.artifactService === 'api')!
                  .service
              }
            : {})
        },
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
      ...(configManager.config ? configManager.allContainerWorkloads.map((workload) => workload.name) : [])
    ]);
    for (const serviceName of services) {
      // A removed service keeps its existing Deny until CloudFormation deletes its role.
      if (run.optOut && !template.Resources[cfLogicalNames.ecsTaskDefinition(serviceName)]) continue;
      protectTaskRole(
        template,
        arn,
        serviceName,
        runs.find((item) => item.service === serviceName)?.recordService ?? `service:${serviceName}`
      );
    }
    if (run.optOut) continue;
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
                Condition: { 'ForAllValues:StringEquals': { 'dynamodb:LeadingKeys': [`release#${run.recordService}`] } }
              },
              {
                Effect: 'Allow',
                Action: ['dynamodb:PutItem'],
                Resource: arn,
                Condition: {
                  'ForAllValues:StringEquals': {
                    'dynamodb:LeadingKeys': [`status#${run.recordService}#\${aws:userid}`]
                  }
                }
              },
              {
                Effect: 'Allow',
                Action: ['s3:GetObject'],
                Resource: `arn:aws:s3:::${artifacts.deploymentBucketName}/code-swap/${run.artifactService}/bundles/*`
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
    const imageHasSupervisor = codeSwapIntegration.imageHasSupervisor.get(run.service);
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

    app.Environment = (app.Environment ?? []).filter(
      (value) => !(value && typeof value === 'object' && 'Name' in value && value.Name === 'STP_SUPERVISOR_ROLE_ID')
    );
    if (imageHasSupervisor !== false)
      app.Environment.push({
        Name: 'STP_SUPERVISOR_ROLE_ID',
        Value: { 'Fn::GetAtt': [cfLogicalNames.ecsTaskRole(run.service), 'RoleId'] }
      });
    definition.Properties = { ...definition.Properties, ContainerDefinitions: containers };
    const service = template.Resources[cfLogicalNames.ecsService(run.service, false)];
    service.DependsOn = [
      ...new Set([
        ...(Array.isArray(service.DependsOn) ? service.DependsOn : service.DependsOn ? [service.DependsOn] : []),
        TABLE_LOGICAL_ID
      ])
    ];
  }
};

// Keep the Deny on the retained role through opt-out. Removing it early would expose a still-running app's table.
export const protectTaskRole = (
  template: CloudFormationTemplate,
  arn: string,
  service: string,
  recordService = 'node'
) => {
  const roleName = cfLogicalNames.ecsTaskRole(service);
  const definitionName = cfLogicalNames.ecsTaskDefinition(service);
  const definition = template.Resources[definitionName];
  // A sibling service in the stack can be blue/green, whose custom resource nests the service's properties.
  const serviceResource =
    template.Resources[cfLogicalNames.ecsService(service, false)] ??
    template.Resources[cfLogicalNames.ecsService(service, true)];
  const taskRole = z.object({ TaskRoleArn: z.unknown().optional() }).parse(definition?.Properties ?? {}).TaskRoleArn;
  const { TaskDefinition: directTaskDefinition, ECSService: nestedService } = z
    .object({
      TaskDefinition: z.unknown().optional(),
      ECSService: z.object({ TaskDefinition: z.unknown().optional() }).loose().optional()
    })
    .loose()
    .parse(serviceResource?.Properties ?? {});
  const taskDefinition = directTaskDefinition ?? nestedService?.TaskDefinition;
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
      Statement: taskTableProtection(arn, recordService)
    }
  });
  role.Properties = { ...role.Properties, Policies: policies };
};

export const codeSwapRollbackTemplate = (template: CloudFormationTemplate) => {
  if (held && !template.Resources[TABLE_LOGICAL_ID]) {
    for (const { service, recordService } of held.services) {
      if (template.Resources[cfLogicalNames.ecsTaskDefinition(service)])
        protectTaskRole(template, held.arn, service, recordService);
    }
  }
};

// A failed final reconciliation leaves the lock to expire, so the next operation repairs the service.
export const retainCodeSwapLock = () => {
  retainLock = true;
};
