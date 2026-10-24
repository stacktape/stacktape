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

const readOutputs = (stackName: string, stack: SharedStackDetails): DevNetwork => {
  const output = (key: string) => {
    const value = stack.Outputs?.find(({ OutputKey }) => OutputKey === key)?.OutputValue;
    if (!value) {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'DEV_NETWORK_OUTPUT_MISSING',
        message: `The dev network stack \`${stackName}\` has no \`${key}\` output.`,
        hints: `Delete it with \`stacktape dev network delete\`; the next \`stacktape dev\` creates it again.`
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

/** The network as deployed, or `undefined` when this account and region has none. */
export const readDevNetwork = async (aws: DevNetworkAws): Promise<DevNetwork | undefined> => {
  const stackName = getDevNetworkName();
  const stack = await aws.stacks.get(stackName);
  if (!stack || stack.StackStatus === 'DELETE_COMPLETE') return undefined;
  // A network being created has no outputs yet.
  if (isBeingChanged(stack.StackStatus) && !stack.Outputs?.length)
    throw devNetworkBusyError(stackName, stack.StackStatus);
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
        message: `The dev network stack \`${stackName}\` is ${stack.StackStatus === 'DELETE_IN_PROGRESS' ? 'still being deleted' : `in state ${stack.StackStatus} after a deletion`}.`,
        hints:
          'Run `stacktape dev network delete` to finish the deletion, then run `stacktape dev` again; it creates a new network.'
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
  pollIntervalMs
}: {
  aws: DevNetworkAws;
  stackName: string;
  isSettled: () => boolean;
  pollIntervalMs: number;
}): Promise<DevNetwork | undefined> => {
  while (!isSettled()) {
    const stack = await aws.stacks.get(stackName);
    // Before the creation call returns the stack may not exist yet; any other state is a finished creation.
    if (stack && stack.StackStatus !== 'CREATE_IN_PROGRESS') return undefined;
    if (stack) {
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
 * A network that is being created is returned as soon as its box exists, about 1 minute after the creation starts, so
 * the dev stack deploys while CloudFormation finishes the network: the keeper function and the box's instance profile
 * take about 3 more minutes. `ready` resolves once the network is complete and the box has its instance profile, and
 * rejects when the creation fails. A session must wait for it before it reports itself ready.
 */
export const ensureDevNetwork = async ({
  aws,
  onCreate,
  onDeletionWait,
  pollIntervalMs
}: {
  aws: DevNetworkAws;
  onCreate: () => void;
  /** Called when a deletion of the network runs, before this waits for it to end and creates the network again. */
  onDeletionWait?: () => void;
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
  const manager = new SharedResourceStackManager({ adapter: aws.stacks, pollIntervalMs });
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
  // A network that exists already is used once it is ready, as before.
  const early =
    !existing || existing.StackStatus === 'CREATE_IN_PROGRESS'
      ? await waitForBoxOfCreatedNetwork({
          aws,
          stackName,
          isSettled: () => settled,
          pollIntervalMs: pollIntervalMs ?? 3000
        })
      : undefined;
  if (early) {
    const ready = ensured.then(
      ({ profileAttached }) => profileAttached,
      (error: Error) => {
        throw new CliError({
          category: 'CLOUDFORMATION',
          code: 'DEV_NETWORK_CREATE_FAILED',
          cause: error,
          message: `Creating the dev network \`${stackName}\` failed after its dev box was created: ${error.message}`,
          hints: [
            'Its CloudFormation events say which resource failed; a failed creation is deleted again.',
            'The dev stage was deployed into the network meanwhile. Delete it with `stacktape delete --stage <stage>`, then run `stacktape dev` again.'
          ]
        });
      }
    );
    // Awaited later; until then a failed creation must not crash the process.
    ready.catch(() => {});
    return { network: early, action: 'create', ready };
  }
  const { action, network, profileAttached } = await ensured;
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
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const current = await aws.stacks.get(network.stackName);
    if (!current || current.StackStatus === 'DELETE_COMPLETE') break;
    if (stack && current.StackId !== stack.StackId) return { deletedLeases: 0, recreated: true };
    if (Date.now() > deadline) {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'DEV_NETWORK_DELETE_TIMEOUT',
        message: `The dev network stack \`${network.stackName}\` is still being deleted (${current.StackStatus}).`,
        hints: 'Run the command again later; it continues the deletion.'
      });
    }
    if (current.StackStatus === 'DELETE_FAILED') {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'DEV_NETWORK_DELETE_FAILED',
        message: `CloudFormation could not delete the dev network stack \`${network.stackName}\`.`,
        hints: 'Open the stack in the CloudFormation console to see which resource failed, then run the command again.'
      });
    }
    await delay(pollIntervalMs);
  }
  const prefix = getDevNetworkLeaseParameterPrefix(network.stackName);
  const leases = await aws.leases.list(prefix);
  if (leases.length) await aws.leases.delete(leases.map(({ name }) => name));
  return { deletedLeases: leases.length, recreated: false };
};
