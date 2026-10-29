import { classifyStage, inferStageNameKind, type StageType } from '@stacktape/console-api/stages';
import { getSharedNetworkStackName } from '@stacktape/naming/shared-stacks';

/**
 * Where a stage's networked resources run:
 * - `shared`: the shared non-production network of the account and region (`stacktape-network`);
 * - `own`: a VPC the stage's stack creates;
 * - `reused`: the VPC named by `stackConfig.vpc.reuseVpc`;
 * - `none`: the stage has no networked resources.
 */
export type NetworkPlacementKind = 'shared' | 'own' | 'reused' | 'none';

/** What the deployed stack already holds. A stack with its own VPC keeps it; a stack in the shared network stays there. */
export type DeployedNetworkPlacement = 'shared' | 'own' | 'none';

export type NetworkPlacementInput = {
  stageName: string;
  /** Whether the stage has resources that need a VPC. */
  needsVpc: boolean;
  /** `stackConfig.vpc.shared`. */
  shared?: boolean;
  reuseVpc: boolean;
  explicitStageType?: StageType;
  consoleStageType?: StageType;
  deployed: DeployedNetworkPlacement;
  /** Why the stage cannot run in the shared network, for example `the MongoDB Atlas cluster \`db\``. */
  exclusions: string[];
  /** The answer to "Is this stage production?", asked once on an interactive first deploy of an ambiguous name. */
  answeredStageType?: StageType;
  /** Whether the deploy may ask that question. CI, agents, MCP and remote runners never do. */
  canAsk: boolean;
};

export type NetworkPlacementDecision =
  | {
      kind: NetworkPlacementKind;
      /** Why, for the deploy output: "the stage name `dev` marks a non-production stage". */
      reason: string;
      /** How to choose differently, when the default decided. */
      hint?: string;
      /** A shared stage that is now production. Printed on every deploy; never blocks it. */
      warning?: string;
    }
  | { kind: 'ask' }
  | { kind: 'error'; code: string; message: string; hints: string[] };

const NETWORK = `\`${getSharedNetworkStackName()}\``;
const CHOOSE_HINT = 'Set `stackConfig.stageType` or `stackConfig.vpc.shared` to choose.';
const MOVE_HINTS = [
  'A deployed stage cannot move between the shared network and a VPC of its own: its databases, caches, load balancers and functions would all be replaced.',
  'To move it, delete the stage with `stacktape delete` and deploy it again.'
];

const describeExclusions = (exclusions: string[]) => exclusions.join(', ');

/**
 * Decides where a stage's networked resources run. The order is the owner's rule:
 * 1. a deployed stack keeps its placement (moving is not supported);
 * 2. `stackConfig.vpc.shared` wins;
 * 3. features the shared network cannot host give the stage its own VPC;
 * 4. `stackConfig.stageType`, then the Console stage type, decide;
 * 5. the stage name decides when it says production or non-production;
 * 6. otherwise an interactive first deploy asks once, and everything else gets its own VPC.
 */
export const decideNetworkPlacement = (input: NetworkPlacementInput): NetworkPlacementDecision => {
  const { stageName, shared, deployed, exclusions } = input;
  if (input.reuseVpc) {
    return { kind: 'reused', reason: '`stackConfig.vpc.reuseVpc`' };
  }
  if (!input.needsVpc) return { kind: 'none', reason: 'no resource of the stage needs a VPC' };

  if (deployed === 'own') {
    if (shared === true) {
      return {
        kind: 'error',
        code: 'NETWORK_PLACEMENT_FIXED',
        message: `Stage \`${stageName}\` runs in a VPC of its own, but \`stackConfig.vpc.shared\` is \`true\`.`,
        hints: [...MOVE_HINTS, 'Or remove `stackConfig.vpc.shared` to keep the stage where it is.']
      };
    }
    return { kind: 'own', reason: 'the stage was first deployed with a VPC of its own' };
  }

  if (deployed === 'shared') {
    if (shared === false) {
      return {
        kind: 'error',
        code: 'NETWORK_PLACEMENT_FIXED',
        message: `Stage \`${stageName}\` runs in the shared non-production network ${NETWORK}, but \`stackConfig.vpc.shared\` is \`false\`.`,
        hints: [...MOVE_HINTS, 'Or remove `stackConfig.vpc.shared` to keep the stage where it is.']
      };
    }
    if (exclusions.length) {
      return {
        kind: 'error',
        code: 'NETWORK_SHARED_UNSUPPORTED',
        message: `Stage \`${stageName}\` runs in the shared non-production network ${NETWORK}, which cannot host ${describeExclusions(exclusions)}.`,
        hints: [
          ...MOVE_HINTS,
          'Deploy it again with `stackConfig.vpc.shared: false` to give it a VPC of its own, or remove what the shared network cannot host.'
        ]
      };
    }
    const { isProduction, source } = classifyStage({
      stageName,
      explicitStageType: input.explicitStageType,
      consoleStageType: input.consoleStageType
    });
    const warning =
      isProduction && shared !== true
        ? `Stage \`${stageName}\` is now ${source === 'inferred' ? 'named like' : 'marked as'} a production stage, but it runs in the shared non-production network ${NETWORK}, next to other non-production stages. Getting a network of its own means deleting and redeploying the stage. Set \`stackConfig.vpc.shared: true\` to keep it shared and silence this warning.`
        : undefined;
    return { kind: 'shared', reason: 'the stage was first deployed in it', warning };
  }

  // The first deploy that creates networked resources.
  if (shared === false) return { kind: 'own', reason: '`stackConfig.vpc.shared` is `false`' };
  if (shared === true) {
    if (exclusions.length) {
      return {
        kind: 'error',
        code: 'NETWORK_SHARED_UNSUPPORTED',
        message: `\`stackConfig.vpc.shared\` is \`true\`, but the shared non-production network cannot host ${describeExclusions(exclusions)}.`,
        hints: ['Remove `stackConfig.vpc.shared` to give the stage a VPC of its own.']
      };
    }
    return { kind: 'shared', reason: '`stackConfig.vpc.shared` is `true`' };
  }
  if (exclusions.length) {
    return { kind: 'own', reason: `the shared network cannot host ${describeExclusions(exclusions)}` };
  }
  const typed = (type: StageType, source: string): NetworkPlacementDecision =>
    type === 'non-production'
      ? { kind: 'shared', reason: `${source} marks a non-production stage` }
      : { kind: 'own', reason: `${source} marks a production stage` };
  if (input.explicitStageType) return typed(input.explicitStageType, '`stackConfig.stageType`');
  if (input.consoleStageType) return typed(input.consoleStageType, 'the stage type chosen in the Stacktape Console');
  const nameKind = inferStageNameKind(stageName);
  if (nameKind !== 'unknown') return typed(nameKind, `the stage name \`${stageName}\``);
  if (input.answeredStageType) return typed(input.answeredStageType, 'your answer');
  if (input.canAsk) return { kind: 'ask' };
  return {
    kind: 'own',
    reason: `the stage name \`${stageName}\` does not say whether it is production`,
    hint: CHOOSE_HINT
  };
};

/** The deploy output line: where the stage runs and why. */
export const formatNetworkPlacement = (
  decision: Extract<NetworkPlacementDecision, { reason: string }>,
  { reusedVpcId }: { reusedVpcId?: string } = {}
) => {
  const where =
    decision.kind === 'shared'
      ? `shared non-production network ${NETWORK}`
      : decision.kind === 'reused'
        ? `reused VPC${reusedVpcId ? ` ${reusedVpcId}` : ''}`
        : 'own VPC';
  return `Network: ${where} (${decision.reason}).${decision.hint ? ` ${decision.hint}` : ''}`;
};
