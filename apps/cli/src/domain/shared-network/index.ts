import ci from 'ci-info';
import { Capability, OnFailure } from '@aws-sdk/client-cloudformation';
import type { StageType } from '@stacktape/console-api/stages';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import {
  SharedResourceStackManager,
  type SharedResourceStackAdapter,
  type SharedStackDetails,
  type SharedStackRequirement
} from '@domain-services/shared-resource-stack-manager';
import { templateManager } from '@domain-services/template-manager';
import { vpcManager, type SharedNetwork } from '@domain-services/vpc-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  getSharedNatStackName,
  getSharedNetworkLastUsedParameterName,
  getSharedNetworkStackName
} from '@stacktape/naming/shared-stacks';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import { isAgentMode } from '../../commands/_utils/agent-mode';
import {
  decideNetworkPlacement,
  formatNetworkPlacement,
  type DeployedNetworkPlacement,
  type NetworkPlacementDecision
} from './placement';
import {
  buildSharedNatTemplate,
  buildSharedNetworkTemplate,
  SHARED_NAT_CONTRACT_VERSION,
  SHARED_NAT_INSTANCE_TYPE,
  SHARED_NAT_KIND,
  SHARED_NETWORK_CONTRACT_VERSION,
  SHARED_NETWORK_KIND,
  SHARED_NETWORK_OWNERSHIP_KEY
} from './template';

const adapter: SharedResourceStackAdapter = {
  get: async (stackName) => (await awsSdkManager.cloudFormation.getDetails(stackName)) ?? undefined,
  create: ({ roleArn, stackName, template, parameters, tags }) =>
    awsSdkManager.cloudFormation.createSharedStack(template, {
      StackName: stackName,
      Parameters: parameters,
      Tags: tags,
      Capabilities: [Capability.CAPABILITY_IAM],
      OnFailure: OnFailure.DELETE,
      // Stages import its exports, so CloudFormation already refuses to delete it while a stage uses it. Protection
      // also keeps an unused network from being deleted by accident; removal is always deliberate.
      EnableTerminationProtection: true,
      ...(roleArn ? { RoleARN: roleArn } : {})
    }),
  update: ({ stackName, template, parameters, tags }) =>
    awsSdkManager.cloudFormation.updateSharedStack(template, {
      StackName: stackName,
      Parameters: parameters,
      Tags: tags,
      Capabilities: [Capability.CAPABILITY_IAM]
    })
};

const requirement = ({
  kind,
  stackName,
  contractVersion,
  template
}: {
  kind: string;
  stackName: string;
  contractVersion: number;
  template: CloudFormationTemplate;
}): SharedStackRequirement => ({
  kind,
  stackName,
  contractVersion,
  template,
  ownershipKey: SHARED_NETWORK_OWNERSHIP_KEY,
  parameters: {},
  roleArn: configManager.deploymentConfig?.cloudformationRoleArn,
  beforeCreate: async () => {},
  // The network's janitor removes the shared stacks after a day without stages; a deploy meanwhile waits and creates
  // them again.
  recreateAfterDeletion: true
});

const outputOf = (stack: SharedStackDetails, key: string) => {
  const value = stack.Outputs?.find(({ OutputKey }) => OutputKey === key)?.OutputValue;
  if (!value) {
    throw new CliError({
      category: 'CLOUDFORMATION',
      code: 'SHARED_NETWORK_OUTPUT_MISSING',
      message: `The shared network stack \`${stack.StackName}\` has no \`${key}\` output (${stack.StackStatus}).`,
      hints: 'Check the stack in CloudFormation. Stacktape does not modify a stack it did not create.'
    });
  }
  return value;
};

/** The network's IDs from its stack outputs. Public subnet `i` and private subnet `i` share zone `i`. */
export const readSharedNetworkOutputs = (stack: SharedStackDetails): SharedNetwork => {
  const zones = outputOf(stack, 'AvailabilityZones').split(',');
  const subnets = (key: string) =>
    outputOf(stack, key)
      .split(',')
      .map((id, index) => ({ id, availabilityZone: zones[index] }));
  return {
    vpcId: outputOf(stack, 'VpcId'),
    vpcCidr: outputOf(stack, 'VpcCidr'),
    publicSubnets: subnets('PublicSubnetIds'),
    privateSubnets: subnets('PrivateSubnetIds')
  };
};

const sharedStackManager = new SharedResourceStackManager({ adapter });

const markUsed = (stackName: string) =>
  awsSdkManager.parameterStore.put({
    name: getSharedNetworkLastUsedParameterName(stackName),
    value: new Date().toISOString()
  });

/** The shared stacks this deploy made sure of. It marks them again while it runs, so a long deploy keeps them too. */
const markedStacks = new Set<string>();
let markTimer: ReturnType<typeof setInterval> | undefined;

const keepMarkingUsed = (stackName: string) => {
  markedStacks.add(stackName);
  if (markTimer) return;
  markTimer = setInterval(() => {
    // The first mark was required; a later one that fails is retried on the next tick.
    for (const name of markedStacks) markUsed(name).catch(() => {});
  }, 30_000);
  markTimer.unref();
};

/** Called once the stage stack imports the shared stacks, or the deploy ended. */
export const stopMarkingSharedNetworkUsed = () => {
  clearInterval(markTimer);
  markTimer = undefined;
  markedStacks.clear();
};

/**
 * Makes sure of a shared stack and keeps the network's janitor from removing it while this deploy builds.
 *
 * The deploy first marks the stack as used (`getSharedNetworkLastUsedParameterName`): the janitor removes a stack only
 * when that mark is older than its grace period, and it reads the mark again after it turned termination protection
 * off. After making sure of the stack, the deploy turns protection on again if it is off, which makes a later delete
 * fail, and reads the stack by ID once more: a delete that got in before that is waited for, and the stack is created
 * again. The deploy marks the stack again every 30 seconds until its stage stack imports it.
 */
const ensureStack = async ({
  stackName,
  creatingMessage,
  requirementInput
}: {
  stackName: string;
  creatingMessage: string;
  requirementInput: Parameters<typeof requirement>[0];
}) => {
  for (let attempt = 1; ; attempt += 1) {
    await markUsed(stackName);
    const before = await adapter.get(stackName);
    if (!before) tuiManager.info(creatingMessage);
    else if (before.StackStatus === 'DELETE_IN_PROGRESS') {
      tuiManager.info(
        `The shared stack \`${stackName}\` is being removed because no stage used it for a day. Waiting for that to finish, then creating it again.`
      );
    }
    await sharedStackManager.ensure(requirement(requirementInput));
    const stack = await adapter.get(stackName);
    if (stack?.StackId && stack.StackStatus !== 'DELETE_IN_PROGRESS') {
      // A removal that stopped, or one that has yet to send its delete, leaves the stack unprotected.
      const protect =
        stack.EnableTerminationProtection === false
          ? awsSdkManager.cloudFormation.setTerminationProtection(true, stack.StackId)
          : Promise.resolve();
      const protectError = await protect.then(
        () => undefined,
        (error: unknown) => error
      );
      const current = await adapter.get(stack.StackId);
      // Protection cannot be changed on a stack being deleted; any other failure leaves the stack unguarded.
      if (protectError && current?.StackStatus !== 'DELETE_IN_PROGRESS') throw protectError;
      if (current?.StackStatus !== 'DELETE_IN_PROGRESS' && current?.StackStatus !== 'DELETE_COMPLETE') {
        keepMarkingUsed(stackName);
        return stack;
      }
    }
    if (attempt >= 3) {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'SHARED_NETWORK_KEEPS_CHANGING',
        message: `The shared stack \`${stackName}\` kept being removed while this deploy made sure of it.`,
        hints: 'Check CloudFormation for deletes of the stack, then retry the deployment.'
      });
    }
  }
};

/** Creates or upgrades the shared network and, when the stage needs outbound internet, its NAT. */
const ensureSharedNetwork = async ({ usesNat }: { usesNat: boolean }): Promise<SharedNetwork> => {
  for (let attempt = 1; ; attempt += 1) {
    const networkStack = await ensureStack({
      stackName: getSharedNetworkStackName(),
      creatingMessage: `Creating the shared non-production network \`${getSharedNetworkStackName()}\` in this account and region (about a minute; it costs nothing).`,
      requirementInput: {
        kind: SHARED_NETWORK_KIND,
        stackName: getSharedNetworkStackName(),
        contractVersion: SHARED_NETWORK_CONTRACT_VERSION,
        template: buildSharedNetworkTemplate()
      }
    });
    const network = readSharedNetworkOutputs(networkStack);
    if (!usesNat) return network;
    try {
      const natStack = await ensureStack({
        stackName: getSharedNatStackName(),
        creatingMessage: `Creating the shared NAT \`${getSharedNatStackName()}\`: one ${SHARED_NAT_INSTANCE_TYPE} instance (about $7.70 a month) that gives every non-production stage here outbound internet. It takes a few minutes, and it is removed once no stage has used it for a day.`,
        requirementInput: {
          kind: SHARED_NAT_KIND,
          stackName: getSharedNatStackName(),
          contractVersion: SHARED_NAT_CONTRACT_VERSION,
          template: buildSharedNatTemplate({ region: globalStateManager.region })
        }
      });
      // The NAT imports the network's exports, so the network it now uses stays. While this deploy waited for the NAT,
      // another deploy may have created the network again; its outputs are then read again.
      const current = await adapter.get(getSharedNetworkStackName());
      if (current?.StackId === networkStack.StackId) {
        return { ...network, natPublicIp: outputOf(natStack, 'PublicIp') };
      }
      if (attempt >= 3) {
        throw new CliError({
          category: 'CLOUDFORMATION',
          code: 'SHARED_NETWORK_KEEPS_CHANGING',
          message: `The shared network \`${getSharedNetworkStackName()}\` kept being removed and created again during this deploy.`,
          hints: 'Wait for other deploys and deletes of non-production stages in this account and region, then retry.'
        });
      }
    } catch (error) {
      // The removal that deleted the NAT went on to delete the network before the NAT was created again, so its
      // creation found no network exports. The network is then created again first.
      const current = await adapter.get(getSharedNetworkStackName());
      const networkReplaced =
        current?.StackId !== networkStack.StackId || current?.StackStatus === 'DELETE_IN_PROGRESS';
      if (!networkReplaced || attempt >= 3) throw error;
    }
  }
};

/** What the deployed template says about placement: a stack with its own VPC keeps it, a shared stage stays shared. */
const getDeployedPlacement = (): DeployedNetworkPlacement => {
  const resources = templateManager.oldTemplate?.Resources ?? {};
  if (resources[cfLogicalNames.vpc()]) return 'own';
  if (resources[cfLogicalNames.stageNetworkSecurityGroup()]) return 'shared';
  return 'none';
};

/** Why this stage cannot run in the shared network. */
const getSharedNetworkExclusions = () => {
  const names = (resources: { name: string }[]) => resources.map(({ name }) => `\`${name}\``).join(', ');
  const exclusions: string[] = [];
  if (configManager.atlasMongoClusters.length) {
    exclusions.push(`MongoDB Atlas clusters (${names(configManager.atlasMongoClusters)}), which peer with the VPC`);
  }
  if (configManager.kafkaClustersWithLambdaEvents.length) {
    exclusions.push(
      `Kafka clusters with function triggers (${names(configManager.kafkaClustersWithLambdaEvents)}), which add VPC-wide endpoints`
    );
  }
  const nat = configManager.natSettings;
  if (nat.configured && nat.type !== 'ec2') {
    exclusions.push(`\`stackConfig.nat: ${nat.type}\` (its NAT is a single \`ec2\` instance)`);
  }
  return exclusions;
};

/** Whether the deploy may ask a question. CI, agents, MCP and remote runners take the default instead. */
const canAsk = () => tuiManager.isTTY && !ci.isCI && !isAgentMode() && !globalStateManager.args.autoConfirmOperation;

const askStageType = async (stage: string): Promise<StageType> => {
  const production = await tuiManager.promptConfirm({
    message: `Is stage ${tuiManager.makeBold(stage)} production? Production stages get a VPC of their own; other stages share one.`
  });
  const stageType: StageType = production ? 'production' : 'non-production';
  // The Console stage type cannot be set from the CLI; the config is where the answer lasts.
  tuiManager.info(
    `To keep this answer for paging, permissions and security checks too, add \`stageType: ${stageType}\` under \`stackConfig\` in your config.`
  );
  return stageType;
};

/**
 * Decides where the stage's networked resources run, prints it, and points synthesis at the shared network when the
 * stage runs there. A deploy creates the shared stacks it needs (`ensure`) and may ask whether an ambiguous stage is
 * production; previews only read them.
 *
 * Returns the promise the synthesis must wait for. A deploy starts it before packaging, so a first creation overlaps
 * with the build.
 */
export const prepareStageNetwork = async ({
  stage,
  mode
}: {
  stage: string;
  /** `deploy` creates what is missing; `preview` (diff, synth, validate) only reads. */
  mode: 'deploy' | 'preview';
}): Promise<{ decision: NetworkPlacementDecision; ready: Promise<void> }> => {
  const input = {
    stageName: stage,
    needsVpc: configManager.allResourcesRequiringVpc.length > 0,
    shared: configManager.stackConfig.vpc?.shared,
    reuseVpc: Boolean(configManager.reuseVpcConfig),
    explicitStageType: configManager.stackConfig.stageType,
    consoleStageType: configManager.consoleStageType,
    deployed: getDeployedPlacement(),
    exclusions: getSharedNetworkExclusions(),
    canAsk: mode === 'deploy' && canAsk()
  };
  let decision = decideNetworkPlacement(input);
  if (decision.kind === 'ask') {
    decision = decideNetworkPlacement({ ...input, answeredStageType: await askStageType(stage) });
  }
  if (decision.kind === 'error') {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: decision.code,
      message: decision.message,
      hints: decision.hints
    });
  }
  if (decision.kind === 'ask') throw new Error('The network placement was asked twice.');
  if (decision.kind !== 'none') {
    tuiManager.info(formatNetworkPlacement(decision, { reusedVpcId: configManager.reuseVpcConfig?.vpcId }));
  }
  if (decision.warning) tuiManager.warn(decision.warning);
  if (decision.kind !== 'shared') {
    vpcManager.useSharedNetwork(undefined);
    return { decision, ready: Promise.resolve() };
  }

  const usesNat = configManager.natSettings.configured && configManager.allResourcesRequiringPrivateSubnets.length > 0;
  if (mode === 'preview') {
    // A preview without access to the account still renders, with the network's exports in place of its IDs.
    const read = (stackName: string) => adapter.get(stackName).catch(() => undefined);
    const stack = await read(getSharedNetworkStackName());
    const natStack = usesNat ? await read(getSharedNatStackName()) : undefined;
    const natPublicIp = natStack?.Outputs?.find(({ OutputKey }) => OutputKey === 'PublicIp')?.OutputValue;
    vpcManager.useSharedNetwork(
      stack?.Outputs?.length ? { ...readSharedNetworkOutputs(stack), natPublicIp } : 'not-created',
      { usesNat }
    );
    return { decision, ready: Promise.resolve() };
  }
  const ready = ensureSharedNetwork({ usesNat }).then((network) => vpcManager.useSharedNetwork(network, { usesNat }));
  // Awaited before synthesis; a failure meanwhile must not surface as an unhandled rejection.
  ready.catch(() => {});
  return { decision, ready };
};
