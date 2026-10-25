import type { Instance } from '@aws-sdk/client-ec2';
import { setTimeout as delay } from 'node:timers/promises';
import { Capability, OnFailure } from '@aws-sdk/client-cloudformation';
import {
  SharedResourceStackManager,
  type SharedResourceStackAdapter,
  type SharedStackDetails
} from '@domain-services/shared-resource-stack-manager';
import { getDevNetworkLeaseParameterPrefix, getDevNetworkStackName } from '@stacktape/naming/shared-stacks';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import type { LeaseStore } from './leases';
import {
  buildDevNetworkTemplate,
  DEV_BOX_IMAGE_PARAMETER,
  DEV_NETWORK_CONTRACT_VERSION,
  DEV_NETWORK_KIND
} from './template';

export type DevNetwork = {
  stackName: string;
  vpcId: string;
  privateSubnetIds: string[];
  lambdaSecurityGroupId: string;
  boxInstanceId: string;
  /** The relay host of every lease. The box keeps its private IP across stops, so dev stacks are deployed with it. */
  boxPrivateIp: string;
  keeperFunctionName: string;
  /** The box's instance profile, which `stacktape dev` attaches; unknown until the network is created. */
  boxInstanceProfileName?: string;
};

export type DevBoxState = {
  state: string;
  publicIp?: string;
  privateIp?: string;
  launchTime?: Date;
  /** Whether an instance profile is attached or being attached. */
  hasInstanceProfile?: boolean;
};

export type DevNetworkStackResource = {
  LogicalResourceId?: string;
  PhysicalResourceId?: string;
  ResourceStatus?: string;
};

/** The AWS operations of the dev network, narrow so the session flow can be tested with fakes. */
export type DevNetworkAws = {
  stacks: SharedResourceStackAdapter & {
    delete: (stackName: string) => Promise<void>;
    listResources: (stackName: string) => Promise<DevNetworkStackResource[]>;
  };
  resolveBoxImageId: () => Promise<string>;
  describeBox: (instanceId: string) => Promise<DevBoxState | undefined>;
  startBox: (instanceId: string) => Promise<void>;
  attachBoxProfile: (instanceId: string, instanceProfileName: string) => Promise<void>;
  isBoxOnline: (instanceId: string) => Promise<boolean>;
  listFunctionsInSecurityGroup: (securityGroupId: string) => Promise<string[]>;
  leases: LeaseStore;
};

/**
 * The network's stack name. One network per account and region; `STACKTAPE_DEV_NETWORK_SUFFIX` exists for guarded live
 * tests, which must own an isolated network.
 */
export const getDevNetworkName = () => getDevNetworkStackName(process.env.STACKTAPE_DEV_NETWORK_SUFFIX?.trim());

const toBoxState = (instance: Instance | undefined): DevBoxState | undefined =>
  instance?.State?.Name
    ? {
        state: instance.State.Name,
        publicIp: instance.PublicIpAddress,
        privateIp: instance.PrivateIpAddress,
        launchTime: instance.LaunchTime,
        hasInstanceProfile: Boolean(instance.IamInstanceProfile)
      }
    : undefined;

export const createDevNetworkAws = (): DevNetworkAws => ({
  stacks: {
    get: async (stackName) => (await awsSdkManager.cloudFormation.getDetails(stackName)) ?? undefined,
    create: ({ stackName, template, parameters, tags }) =>
      awsSdkManager.cloudFormation.createSharedStack(template, {
        StackName: stackName,
        Parameters: parameters,
        Tags: tags,
        Capabilities: [Capability.CAPABILITY_IAM],
        OnFailure: OnFailure.DELETE
      }),
    update: ({ stackName, template, parameters, tags }) =>
      awsSdkManager.cloudFormation.updateSharedStack(template, {
        StackName: stackName,
        Parameters: parameters,
        Tags: tags,
        Capabilities: [Capability.CAPABILITY_IAM]
      }),
    delete: async (stackName) => {
      await awsSdkManager.cloudFormation.delete(stackName, {});
    },
    listResources: (stackName) => awsSdkManager.cloudFormation.getResources(stackName)
  },
  resolveBoxImageId: async () => {
    const { Parameter } = await awsSdkManager.parameterStore.get({ name: DEV_BOX_IMAGE_PARAMETER });
    if (!Parameter?.Value) throw new Error(`The public parameter ${DEV_BOX_IMAGE_PARAMETER} has no value.`);
    return Parameter.Value;
  },
  describeBox: async (instanceId) => toBoxState(await awsSdkManager.ec2.describeInstance(instanceId)),
  startBox: (instanceId) => awsSdkManager.ec2.startInstance(instanceId),
  attachBoxProfile: (instanceId, instanceProfileName) =>
    awsSdkManager.ec2.associateInstanceProfile({ instanceId, instanceProfileName }),
  isBoxOnline: (instanceId) => awsSdkManager.systemsManager.isInstanceOnline({ instanceId }),
  listFunctionsInSecurityGroup: (securityGroupId) => awsSdkManager.lambda.listFunctionsInSecurityGroup(securityGroupId),
  leases: {
    list: (prefix) => awsSdkManager.parameterStore.listByPath({ path: prefix }),
    create: (name, value) => awsSdkManager.parameterStore.createIfAbsent({ name, value }),
    delete: (names) => awsSdkManager.parameterStore.deleteMany({ names })
  }
});

/**
 * How to remove a network whose creation failed after dev stages were deployed into it, in the order that works: the
 * stages' functions keep network interfaces in its subnets, so CloudFormation cannot delete it before they are gone.
 */
export const FAILED_DEV_NETWORK_RECOVERY = [
  'Delete the dev stages that use the network, with `stacktape delete --stage <stage>`.',
  'Wait a few minutes: Lambda releases the network interfaces of deleted functions only after a while.',
  'Run `stacktape dev network delete`, then `stacktape dev`; it creates a new network.'
];

/** A network stack whose creation failed and that CloudFormation could not delete again: it has no outputs. */
export type FailedDevNetwork = { stackName: string; stackId?: string; status: string; reason?: string };

const describeFailure = ({ status, reason }: { status?: string; reason?: string }) =>
  `${status ?? 'unknown state'}${reason?.trim() ? `: ${reason.trim()}` : ''}`;

const failedDevNetworkError = (failed: FailedDevNetwork, cause?: unknown) =>
  new CliError({
    category: 'CLOUDFORMATION',
    code: 'DEV_NETWORK_CREATION_FAILED',
    cause,
    message: `The dev network stack \`${failed.stackName}\` failed to be created and was not deleted again (${describeFailure(failed)}).`,
    hints: FAILED_DEV_NETWORK_RECOVERY
  });

const readOutputs = (stackName: string, stack: SharedStackDetails): DevNetwork => {
  const output = (key: string) => {
    const value = stack.Outputs?.find(({ OutputKey }) => OutputKey === key)?.OutputValue;
    if (!value) {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'DEV_NETWORK_OUTPUT_MISSING',
        message: `The dev network stack \`${stackName}\` has no \`${key}\` output (${describeFailure({ status: stack.StackStatus, reason: stack.StackStatusReason })}).`,
        hints: FAILED_DEV_NETWORK_RECOVERY
      });
    }
    return value;
  };
  return {
    stackName,
    vpcId: output('VpcId'),
    privateSubnetIds: output('PrivateSubnetIds').split(','),
    lambdaSecurityGroupId: output('LambdaSecurityGroupId'),
    boxInstanceId: output('BoxInstanceId'),
    boxPrivateIp: output('BoxPrivateIp'),
    keeperFunctionName: output('KeeperFunctionName'),
    // Networks created before contract version 3 have none; they are updated before they are used.
    boxInstanceProfileName: stack.Outputs?.find(({ OutputKey }) => OutputKey === 'BoxInstanceProfileName')?.OutputValue
  };
};

/** A CloudFormation operation other than a deletion runs on the stack: a `stacktape dev` session creates or updates it. */
const isBeingChanged = (status: string | undefined) =>
  Boolean(status?.endsWith('_IN_PROGRESS') && status !== 'DELETE_IN_PROGRESS');

const devNetworkBusyError = (stackName: string, status: string | undefined) =>
  new CliError({
    category: 'CLOUDFORMATION',
    code: 'DEV_NETWORK_BUSY',
    message: `The dev network stack \`${stackName}\` is being ${status?.startsWith('CREATE') ? 'created' : 'updated'} (${status}), most likely by a \`stacktape dev\` session that just started.`,
    hints: 'Run the command again once CloudFormation has finished, in a few minutes.'
  });

const toFailedDevNetwork = (stackName: string, stack: SharedStackDetails | undefined): FailedDevNetwork | undefined => {
  const status = stack?.StackStatus;
  if (!stack || !status || stack.Outputs?.length || status === 'DELETE_COMPLETE' || status.endsWith('_IN_PROGRESS'))
    return undefined;
  return { stackName, stackId: stack.StackId, status, reason: stack.StackStatusReason?.trim() || undefined };
};

/**
 * The network's stack when its creation failed and CloudFormation could not delete it again, usually because dev
 * functions deployed while it was created keep its subnets in use. Such a stack has no outputs.
 */
export const readFailedDevNetwork = async (aws: DevNetworkAws): Promise<FailedDevNetwork | undefined> => {
  const stackName = getDevNetworkName();
  return toFailedDevNetwork(stackName, await aws.stacks.get(stackName));
};

/** The network as deployed, or `undefined` when this account and region has none. */
export const readDevNetwork = async (aws: DevNetworkAws): Promise<DevNetwork | undefined> => {
  const stackName = getDevNetworkName();
  const stack = await aws.stacks.get(stackName);
  if (!stack || stack.StackStatus === 'DELETE_COMPLETE') return undefined;
  // A network being created has no outputs yet.
  if (isBeingChanged(stack.StackStatus) && !stack.Outputs?.length)
    throw devNetworkBusyError(stackName, stack.StackStatus);
  const failed = toFailedDevNetwork(stackName, stack);
  if (failed) throw failedDevNetworkError(failed);
  if (stack.StackStatus === 'DELETE_IN_PROGRESS' && !stack.Outputs?.length) {
    throw new CliError({
      category: 'CLOUDFORMATION',
      code: 'DEV_NETWORK_BEING_DELETED',
      message: `CloudFormation is deleting the dev network stack \`${stackName}\` after its creation failed (${describeFailure({ status: stack.StackStatus, reason: stack.StackStatusReason })}).`,
      hints: [
        'Dev stages deployed into the network keep it from being deleted; then the deletion fails after a while.',
        ...FAILED_DEV_NETWORK_RECOVERY
      ]
    });
  }
  return readOutputs(stackName, stack);
};

/**
 * Waits until a deletion that runs ends: `stacktape dev network delete` may run while a session starts. A stack with
 * another id under the same name is a network another session created after the deletion.
 */
const waitForDeletion = async ({
  aws,
  stackName,
  stackId,
  pollIntervalMs,
  timeoutMs
}: {
  aws: DevNetworkAws;
  stackName: string;
  stackId: string | undefined;
  pollIntervalMs: number;
  timeoutMs: number;
}) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const stack = await aws.stacks.get(stackName);
    if (!stack || stack.StackStatus === 'DELETE_COMPLETE' || stack.StackId !== stackId) return;
    if (stack.StackStatus !== 'DELETE_IN_PROGRESS' || Date.now() > deadline) {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'DEV_NETWORK_DELETE_FAILED',
        message: `The dev network stack \`${stackName}\` ${stack.StackStatus === 'DELETE_IN_PROGRESS' ? 'is still being deleted' : `could not be deleted (${describeFailure({ status: stack.StackStatus, reason: stack.StackStatusReason })})`}.`,
        hints: FAILED_DEV_NETWORK_RECOVERY
      });
    }
    await delay(pollIntervalMs);
  }
};

/** What the dev stack and the box connection need of a network that is being created, as its logical ids. */
const EARLY_RESOURCES = ['Vpc', 'PrivateSubnet0', 'PrivateSubnet1', 'LambdaSecurityGroup', 'Box'] as const;

/**
 * The network that is being created, once its subnets, the dev functions' security group and the box exist. The keeper
 * function takes minutes longer: Lambda creates the network interfaces of the dev functions with it. Resolves
 * `undefined` when `isSettled` turns true first, or when the stack is not being created.
 */
const waitForBoxOfCreatedNetwork = async ({
  aws,
  stackName,
  isSettled,
  isCreatedHere,
  pollIntervalMs
}: {
  aws: DevNetworkAws;
  stackName: string;
  isSettled: () => boolean;
  /** Whether this session's creation call returned; a stack another session creates is not used early. */
  isCreatedHere: () => boolean;
  pollIntervalMs: number;
}): Promise<DevNetwork | undefined> => {
  while (!isSettled()) {
    const stack = await aws.stacks.get(stackName);
    // Before the creation call returns the stack may not exist yet; any other state is a finished creation.
    if (stack && stack.StackStatus !== 'CREATE_IN_PROGRESS') return undefined;
    if (stack && isCreatedHere()) {
      const resources = new Map(
        (await aws.stacks.listResources(stackName)).map((resource) => [resource.LogicalResourceId, resource])
      );
      const created = EARLY_RESOURCES.map((id) => resources.get(id));
      if (created.every((resource) => resource?.ResourceStatus === 'CREATE_COMPLETE' && resource.PhysicalResourceId)) {
        const [vpc, subnet0, subnet1, securityGroup, box] = created.map((resource) => resource!.PhysicalResourceId!);
        const boxPrivateIp = (await aws.describeBox(box))?.privateIp;
        if (boxPrivateIp) {
          return {
            stackName,
            vpcId: vpc,
            privateSubnetIds: [subnet0, subnet1],
            lambdaSecurityGroupId: securityGroup,
            boxInstanceId: box,
            boxPrivateIp,
            // The template names it.
            keeperFunctionName: `${stackName}-keeper`
          };
        }
      }
    }
    await delay(pollIntervalMs);
  }
  return undefined;
};

/**
 * Attaches the box's instance profile when it has none: the template starts the box without it (see the template), and
 * a session that created the network may have ended before it attached it.
 */
const attachMissingBoxProfile = async (aws: DevNetworkAws, network: DevNetwork) => {
  if (!network.boxInstanceProfileName) return;
  const box = await aws.describeBox(network.boxInstanceId);
  if (!box || box.hasInstanceProfile || box.state === 'terminated' || box.state === 'shutting-down') return;
  await aws.attachBoxProfile(network.boxInstanceId, network.boxInstanceProfileName);
};

/**
 * Returns the account and region's dev network, creating it on first use or updating one created by an older Stacktape
 * version. `onCreate` runs once, before a creation starts.
 *
 * A network this call creates is returned as soon as its box exists, about 1 minute after the creation starts, so the
 * dev stack deploys while CloudFormation finishes the network: the keeper function and the box's instance profile take
 * about 3 more minutes. `ready` resolves once the network is complete and the box has its instance profile, and rejects
 * as soon as the creation fails. A session must wait for it before it reports itself ready. A creation another session
 * started is waited for in full, so that this session checks the box for a session of its stage before it deploys.
 */
export const ensureDevNetwork = async ({
  aws,
  onCreate,
  onDeletionWait,
  onJoinCreation,
  pollIntervalMs
}: {
  aws: DevNetworkAws;
  onCreate: () => void;
  /** Called when a deletion of the network runs, before this waits for it to end and creates the network again. */
  onDeletionWait?: () => void;
  /** Called when another session creates the network, before this waits for that creation. */
  onJoinCreation?: () => void;
  pollIntervalMs?: number;
}): Promise<{ network: DevNetwork; action: 'create' | 'upgrade' | 'reuse'; ready: Promise<void> }> => {
  const stackName = getDevNetworkName();
  let existing = await aws.stacks.get(stackName);
  if (existing?.StackStatus === 'DELETE_IN_PROGRESS' || existing?.StackStatus === 'DELETE_FAILED') {
    if (existing.StackStatus === 'DELETE_IN_PROGRESS') onDeletionWait?.();
    await waitForDeletion({
      aws,
      stackName,
      stackId: existing.StackId,
      pollIntervalMs: pollIntervalMs ?? 5000,
      timeoutMs: 20 * 60_000
    });
    existing = undefined;
  }
  const failedBefore = toFailedDevNetwork(stackName, existing);
  if (failedBefore) throw failedDevNetworkError(failedBefore);
  // Only the session that created the network uses it before it is complete. A session that finds another one's
  // creation running waits for the whole network, then checks for a session of its stage like on any running box.
  let createdHere = false;
  const adapter: SharedResourceStackAdapter = {
    ...aws.stacks,
    create: async (input) => {
      const created = await aws.stacks.create(input);
      createdHere = true;
      return created;
    }
  };
  const manager = new SharedResourceStackManager({ adapter, pollIntervalMs });
  const ensured = manager
    .ensure({
      kind: DEV_NETWORK_KIND,
      contractVersion: DEV_NETWORK_CONTRACT_VERSION,
      ownershipKey: stackName,
      stackName,
      // A new image would replace the box and change its private IP: keep the image the network was created with.
      parameters: { ImageId: existing ? '' : await aws.resolveBoxImageId() },
      mergeParameters: ({ desired, existing: current }) => ({ ImageId: current.ImageId || desired.ImageId }),
      template: buildDevNetworkTemplate({ networkName: stackName }),
      beforeCreate: async () => onCreate()
    })
    .then(async ({ action }) => {
      const stack = await aws.stacks.get(stackName);
      if (!stack) {
        throw new CliError({
          category: 'CLOUDFORMATION',
          code: 'DEV_NETWORK_DISAPPEARED',
          message: `The dev network stack \`${stackName}\` disappeared while it was being prepared: \`stacktape dev network delete\` probably deleted it.`,
          hints: 'Run `stacktape dev` again; it creates a new network.'
        });
      }
      const network = readOutputs(stackName, stack);
      return { action, network, profileAttached: attachMissingBoxProfile(aws, network) };
    });
  let settled = false;
  ensured.then(
    () => (settled = true),
    () => (settled = true)
  );
  const isSettled = () => settled;
  const pollMs = pollIntervalMs ?? 3000;
  // CloudFormation's rollback of a failed creation can take far longer than the creation, for example while network
  // interfaces of dev functions block it, so a failure is reported as soon as the stack leaves the creation.
  const watchesCreation = !existing || existing.StackStatus === 'CREATE_IN_PROGRESS';
  const creationFailed = watchesCreation
    ? (async (): Promise<never> => {
        while (!isSettled()) {
          await delay(pollMs);
          const stack = await aws.stacks.get(stackName).catch(() => undefined);
          const status = stack?.StackStatus;
          if (status && status !== 'CREATE_IN_PROGRESS' && status !== 'CREATE_COMPLETE' && !isSettled()) {
            throw new Error(`CloudFormation reports ${describeFailure({ status, reason: stack?.StackStatusReason })}.`);
          }
        }
        return new Promise<never>(() => {});
      })()
    : new Promise<never>(() => {});
  creationFailed.catch(() => {});
  const creationFailedError = (error: Error, deployedMeanwhile: boolean) =>
    new CliError({
      category: 'CLOUDFORMATION',
      code: 'DEV_NETWORK_CREATE_FAILED',
      cause: error,
      message: `Creating the dev network \`${stackName}\` failed. ${error.message}`,
      hints: [
        deployedMeanwhile
          ? 'This session deployed its dev stage into the network meanwhile, so CloudFormation cannot delete the failed network until the stage is gone.'
          : 'Another `stacktape dev` session created it and may have deployed its dev stage into it; CloudFormation cannot delete the failed network until such stages are gone.',
        ...FAILED_DEV_NETWORK_RECOVERY
      ]
    });
  if (existing?.StackStatus === 'CREATE_IN_PROGRESS') onJoinCreation?.();
  const early = !existing
    ? await Promise.race([
        waitForBoxOfCreatedNetwork({
          aws,
          stackName,
          isSettled,
          isCreatedHere: () => createdHere,
          pollIntervalMs: pollMs
        }),
        creationFailed
      ]).catch((error: Error) => {
        throw creationFailedError(error, false);
      })
    : undefined;
  if (early) {
    const ready = Promise.race([ensured.then(({ profileAttached }) => profileAttached), creationFailed]).catch(
      (error: Error) => {
        throw error instanceof CliError ? error : creationFailedError(error, true);
      }
    );
    // Awaited later; until then a failed creation must not crash the process.
    ready.catch(() => {});
    return { network: early, action: 'create', ready };
  }
  const { action, network, profileAttached } = await Promise.race([ensured, creationFailed]).catch(
    async (error: unknown) => {
      if (!(error instanceof CliError) && watchesCreation) throw creationFailedError(error as Error, false);
      // A creation that failed and could not be deleted again, by this session or another, needs the recovery steps.
      const failed = toFailedDevNetwork(stackName, await aws.stacks.get(stackName).catch(() => undefined));
      if (failed) throw failedDevNetworkError(failed, error);
      throw error;
    }
  );
  profileAttached.catch(() => {});
  return { network, action, ready: profileAttached };
};

const BOX_POLL_MS = 2000;

/**
 * Starts the box if it is stopped and resolves once it runs. A box that is stopping (its idle stop) is started again
 * once the stop completes.
 */
export const wakeDevBox = async ({
  aws,
  instanceId,
  timeoutMs = 5 * 60_000,
  pollMs = BOX_POLL_MS,
  onStart
}: {
  aws: DevNetworkAws;
  instanceId: string;
  timeoutMs?: number;
  pollMs?: number;
  /** Called once when the box is not running yet, so the caller can say that it waits for it. */
  onStart?: () => void;
}): Promise<{ started: boolean }> => {
  const deadline = Date.now() + timeoutMs;
  let started = false;
  let waiting = false;
  while (Date.now() < deadline) {
    const box = await aws.describeBox(instanceId);
    if (!box || box.state === 'terminated' || box.state === 'shutting-down') {
      throw new CliError({
        category: 'AWS',
        code: 'DEV_BOX_TERMINATED',
        message: `The dev box ${instanceId} no longer exists.`,
        hints: 'Delete the dev network with `stacktape dev network delete`; the next `stacktape dev` creates it again.'
      });
    }
    if (box.state === 'running') return { started };
    if (!waiting) {
      waiting = true;
      onStart?.();
    }
    if (box.state === 'stopped') {
      await aws.startBox(instanceId);
      started = true;
    }
    await delay(pollMs);
  }
  throw new CliError({
    category: 'AWS',
    code: 'DEV_BOX_START_TIMEOUT',
    message: `The dev box ${instanceId} did not start within ${Math.round(timeoutMs / 60_000)} minutes.`,
    hints: 'Check the instance in the EC2 console, then run `stacktape dev` again.'
  });
};

/**
 * Resolves once the box runs and its SSM agent is connected, so a session can start. A box that stops meanwhile (its
 * idle stop, or someone stopping it) is started again instead of waiting for SSM until the deadline.
 */
export const waitForDevBoxOnline = async ({
  aws,
  instanceId,
  timeoutMs = 5 * 60_000,
  pollMs = BOX_POLL_MS,
  onStart
}: {
  aws: DevNetworkAws;
  instanceId: string;
  timeoutMs?: number;
  pollMs?: number;
  /** Called when the box has to be started again. */
  onStart?: () => void;
}) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // The instance state first: SSM can report a box online for a while after it stopped.
    const box = await aws.describeBox(instanceId);
    if (box?.state !== 'running' && box?.state !== 'pending') {
      await wakeDevBox({ aws, instanceId, pollMs, onStart });
      continue;
    }
    if (box.state === 'running' && (await aws.isBoxOnline(instanceId))) return;
    await delay(pollMs);
  }
  throw new CliError({
    category: 'AWS',
    code: 'DEV_BOX_SSM_TIMEOUT',
    message: `The dev box ${instanceId} runs, but its SSM agent did not connect within ${Math.round(timeoutMs / 60_000)} minutes.`,
    hints:
      'The box needs outbound internet for SSM. Check the instance in the EC2 console, then run `stacktape dev` again.'
  });
};

/** A live `stacktape dev` session in the network, as the relay reports it. */
export type LiveDevSession = { stack: string; label: string; since: number };

/**
 * Deletes the network and its leases. It refuses up front, instead of failing after many minutes or breaking someone's
 * session:
 * - while CloudFormation creates or updates the network, which a starting `stacktape dev` session does;
 * - while `stacktape dev` sessions use the network, unless `force`. A session keeps the box running, so only a running
 *   or starting box is asked; a box whose sessions cannot be listed refuses too;
 * - while dev functions are in the network: they keep its subnets in use, and the deletion would fail.
 *
 * The stack state is read again right before the deletion, so an update a session started meanwhile is not cut off.
 * A deletion that runs already is waited for. A session that starts during the deletion creates a new network under
 * the same name once the old one is gone; the deletion then ends without removing the leases the new one may use.
 */
export const deleteDevNetwork = async ({
  aws,
  network,
  force = false,
  findLiveSessions,
  pollIntervalMs = 5000,
  timeoutMs = 20 * 60_000
}: {
  aws: DevNetworkAws;
  network: DevNetwork;
  force?: boolean;
  /** Lists the sessions through the relay of a running box; rejects when it cannot. */
  findLiveSessions: (network: DevNetwork) => Promise<LiveDevSession[]>;
  pollIntervalMs?: number;
  timeoutMs?: number;
}) => {
  const assertNotBeingChanged = async () => {
    const stack = await aws.stacks.get(network.stackName);
    if (isBeingChanged(stack?.StackStatus)) throw devNetworkBusyError(network.stackName, stack?.StackStatus);
    return stack;
  };
  let stack = await assertNotBeingChanged();
  if (stack && stack.StackStatus !== 'DELETE_IN_PROGRESS') {
    const box = await aws.describeBox(network.boxInstanceId);
    if (!force && (box?.state === 'running' || box?.state === 'pending')) {
      let sessions: LiveDevSession[];
      try {
        sessions = await findLiveSessions(network);
      } catch (error) {
        throw new CliError({
          category: 'CLI',
          code: 'DEV_NETWORK_SESSIONS_UNKNOWN',
          message: `The dev box runs, so a \`stacktape dev\` session may use the network, but its sessions could not be listed: ${(error as Error).message}.`,
          hints: [
            'Run the command again in a minute. A box that has just started needs about a minute to answer.',
            'To delete the network anyway, add `--force`; sessions that use it lose their connection.'
          ]
        });
      }
      if (sessions.length) {
        const listed = sessions
          .map(
            ({ stack: stackName, label, since }) =>
              `${stackName} (${label}, since ${new Date(since * 1000).toLocaleTimeString()})`
          )
          .join(', ');
        throw new CliError({
          category: 'CLI',
          code: 'DEV_NETWORK_SESSIONS_LIVE',
          message: `\`stacktape dev\` sessions use the dev network: ${listed}.`,
          hints: [
            'Stop those sessions, then delete their dev stages with `stacktape delete --stage <stage>`.',
            'To delete the network anyway, add `--force`; those sessions lose their connection.'
          ]
        });
      }
    }
    const users = (await aws.listFunctionsInSecurityGroup(network.lambdaSecurityGroupId)).filter(
      (name) => name !== network.keeperFunctionName
    );
    if (users.length) {
      throw new CliError({
        category: 'CLI',
        code: 'DEV_NETWORK_IN_USE',
        message: `The dev network is still used by ${users.length} dev function${users.length === 1 ? '' : 's'}: ${users.join(', ')}.`,
        hints: 'Delete the dev stages they belong to first, with `stacktape delete --stage <stage>`.'
      });
    }
    // A session may have started creating or updating the network while the checks above ran.
    stack = await assertNotBeingChanged();
    await aws.stacks.delete(network.stackName);
  }
  return waitForNetworkDeletion({
    aws,
    stackName: network.stackName,
    stackId: stack?.StackId,
    deleteStartedFrom: stack?.StackStatus,
    pollIntervalMs,
    timeoutMs
  });
};

/**
 * Waits for a deletion of the network's stack, then removes its leases. A stack with another id under the same name is a
 * network a session created after the deletion; its leases are kept. A deletion started on a stack in `DELETE_FAILED`
 * reads that state until CloudFormation has started it, so the state counts only after the deletion was seen running.
 */
const waitForNetworkDeletion = async ({
  aws,
  stackName,
  stackId,
  deleteStartedFrom,
  pollIntervalMs,
  timeoutMs
}: {
  aws: DevNetworkAws;
  stackName: string;
  stackId: string | undefined;
  deleteStartedFrom: string | undefined;
  pollIntervalMs: number;
  timeoutMs: number;
}) => {
  const deadline = Date.now() + timeoutMs;
  let seenRunning = deleteStartedFrom !== 'DELETE_FAILED';
  for (;;) {
    const current = await aws.stacks.get(stackName);
    if (!current || current.StackStatus === 'DELETE_COMPLETE') break;
    if (stackId && current.StackId !== stackId) return { deletedLeases: 0, recreated: true };
    if (current.StackStatus === 'DELETE_IN_PROGRESS') seenRunning = true;
    if (Date.now() > deadline) {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'DEV_NETWORK_DELETE_TIMEOUT',
        message: `The dev network stack \`${stackName}\` is still being deleted (${current.StackStatus}).`,
        hints: 'Run the command again later; it continues the deletion.'
      });
    }
    if (current.StackStatus === 'DELETE_FAILED' && seenRunning) {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'DEV_NETWORK_DELETE_FAILED',
        message: `CloudFormation could not delete the dev network stack \`${stackName}\` (${describeFailure({ status: current.StackStatus, reason: current.StackStatusReason })}).`,
        hints: [
          'Lambda releases the network interfaces of deleted dev functions only after a few minutes; run the command again then.',
          'If it fails again, the CloudFormation console shows which resource is still in use.'
        ]
      });
    }
    await delay(pollIntervalMs);
  }
  const prefix = getDevNetworkLeaseParameterPrefix(stackName);
  const leases = await aws.leases.list(prefix);
  if (leases.length) await aws.leases.delete(leases.map(({ name }) => name));
  return { deletedLeases: leases.length, recreated: false };
};

/**
 * Deletes a network whose creation failed (see `readFailedDevNetwork`) by its stack name alone: it has no box or relay
 * to ask, and no outputs. It refuses a stack Stacktape does not own, and while dev functions still use the network's
 * security group, whose network interfaces would make the deletion fail again.
 */
export const deleteFailedDevNetwork = async ({
  aws,
  failed,
  pollIntervalMs = 5000,
  timeoutMs = 20 * 60_000
}: {
  aws: DevNetworkAws;
  failed: FailedDevNetwork;
  pollIntervalMs?: number;
  timeoutMs?: number;
}) => {
  const stack = await aws.stacks.get(failed.stackName);
  if (!stack || stack.StackStatus === 'DELETE_COMPLETE') return { deletedLeases: 0, recreated: false };
  if (stack.StackId !== failed.stackId || isBeingChanged(stack.StackStatus))
    throw devNetworkBusyError(failed.stackName, stack.StackStatus);
  const kind = stack.Tags?.find(({ Key }) => Key === 'stacktape:shared-resource-kind')?.Value;
  if (kind !== DEV_NETWORK_KIND) {
    throw new CliError({
      category: 'CLOUDFORMATION',
      code: 'DEV_NETWORK_FOREIGN',
      message: `The CloudFormation stack \`${failed.stackName}\` is not a Stacktape dev network; Stacktape does not delete it.`,
      hints: 'Check who created the stack, and delete it in the CloudFormation console if it is safe to.'
    });
  }
  if (stack.StackStatus !== 'DELETE_IN_PROGRESS') {
    const resources = await aws.stacks.listResources(failed.stackName);
    const securityGroupId = resources.find(
      ({ LogicalResourceId, ResourceStatus }) =>
        LogicalResourceId === 'LambdaSecurityGroup' && ResourceStatus !== 'DELETE_COMPLETE'
    )?.PhysicalResourceId;
    const users = securityGroupId
      ? (await aws.listFunctionsInSecurityGroup(securityGroupId)).filter(
          (name) => name !== `${failed.stackName}-keeper`
        )
      : [];
    if (users.length) {
      throw new CliError({
        category: 'CLI',
        code: 'DEV_NETWORK_IN_USE',
        message: `The failed dev network is still used by ${users.length} dev function${users.length === 1 ? '' : 's'}: ${users.join(', ')}.`,
        hints: FAILED_DEV_NETWORK_RECOVERY
      });
    }
    await aws.stacks.delete(failed.stackName);
  }
  return waitForNetworkDeletion({
    aws,
    stackName: failed.stackName,
    stackId: stack.StackId,
    deleteStartedFrom: stack.StackStatus,
    pollIntervalMs,
    timeoutMs
  });
};
