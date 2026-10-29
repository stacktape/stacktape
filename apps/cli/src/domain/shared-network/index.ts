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
import { getSharedNatStackName, getSharedNetworkStackName } from '@stacktape/naming/shared-stacks';
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
  // The last stage's delete removes the shared stacks (`removal.ts`); a deploy meanwhile waits and creates them again.
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

/** The shared stacks this deploy's template is built for, by stack ID. */
const ensuredStacks = new Map<string, string>();

const ensureStack = async ({
  stackName,
  creatingMessage,
  requirementInput
}: {
  stackName: string;
  creatingMessage: string;
  requirementInput: Parameters<typeof requirement>[0];
}) => {
  const before = await adapter.get(stackName);
  if (!before) tuiManager.info(creatingMessage);
  else if (before.StackStatus === 'DELETE_IN_PROGRESS') {
    tuiManager.info(
      `The shared stack \`${stackName}\` is being removed because the last stage that used it was deleted. Waiting for that to finish, then creating it again.`
    );
  }
  await sharedStackManager.ensure(requirement(requirementInput));
  const stack = await adapter.get(stackName);
  if (!stack) {
    throw new CliError({
      category: 'CLOUDFORMATION',
      code: 'SHARED_NETWORK_DISAPPEARED',
      message: `The shared stack \`${stackName}\` disappeared right after it was ready.`,
      hints: 'Check CloudFormation for a deletion, then retry the deployment.'
    });
  }
  // A removal that CloudFormation canceled, because a stage started using the stack meanwhile, can leave it unprotected.
  if (stack.EnableTerminationProtection === false) {
    await awsSdkManager.cloudFormation.setTerminationProtection(true, stackName);
  }
  if (stack.StackId) ensuredStacks.set(stackName, stack.StackId);
  return stack;
};

/**
 * Fails the deploy when a shared stack its template was built for is gone: the delete of the last stage that used it
 * removed it after this deploy had made sure of it. The template holds the network's IDs, so it cannot be submitted,
 * and CloudFormation would refuse its imports anyway. Running the deploy again creates the stacks again.
 */
export const confirmSharedNetworkUnchanged = async () => {
  for (const [stackName, stackId] of ensuredStacks) {
    const stack = await adapter.get(stackName);
    if (stack?.StackId === stackId && stack.StackStatus !== 'DELETE_IN_PROGRESS') continue;
    throw new CliError({
      category: 'CLOUDFORMATION',
      code: 'SHARED_NETWORK_REMOVED_DURING_DEPLOY',
      message: `The shared stack \`${stackName}\` was removed while this deploy was building: the delete of the last stage that used it removed it.`,
      hints: 'Run the deploy again. It creates the shared stack again before it builds the template.'
    });
  }
};

/** Creates or upgrades the shared network and, when the stage needs outbound internet, its NAT. */
const ensureSharedNetwork = async ({ usesNat }: { usesNat: boolean }): Promise<SharedNetwork> => {
  for (let attempt = 1; ; attempt += 1) {
    const networkStack = await ensureStack({
      stackName: getSharedNetworkStackName(),
      creatingMessage: `Creating the shared non-production network \`${getSharedNetworkStackName()}\` in this account and region (about a minute, once; it costs nothing).`,
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
        creatingMessage: `Creating the shared NAT \`${getSharedNatStackName()}\`: one ${SHARED_NAT_INSTANCE_TYPE} instance (about $7.70 a month) that gives every non-production stage here outbound internet. It takes a few minutes, once, and is removed with the last stage that uses it.`,
        requirementInput: {
          kind: SHARED_NAT_KIND,
          stackName: getSharedNatStackName(),
          contractVersion: SHARED_NAT_CONTRACT_VERSION,
          template: buildSharedNatTemplate({ region: globalStateManager.region })
        }
      });
      // The NAT imports the network's exports, so the network it was created or found with stays.
      return { ...network, natPublicIp: outputOf(natStack, 'PublicIp') };
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
