import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { CliError } from '@utils/errors';

export type SharedStackDetails = {
  StackId?: string;
  StackName?: string;
  StackStatus?: string;
  Parameters?: Array<{ ParameterKey?: string; ParameterValue?: string }>;
  Outputs?: Array<{ OutputKey?: string; OutputValue?: string }>;
  RoleARN?: string;
  Tags?: Array<{ Key?: string; Value?: string }>;
};

export type SharedStackRequirement = {
  contractVersion: number;
  kind: string;
  ownershipKey: string;
  parameters: Record<string, string>;
  mergeParameters?: (input: {
    desired: Record<string, string>;
    existing: Record<string, string>;
  }) => Record<string, string>;
  roleArn?: string;
  stackName: string;
  template: CloudFormationTemplate;
  beforeCreate: () => Promise<void>;
};

export type SharedResourceStackAdapter = {
  create: (input: {
    roleArn?: string;
    stackName: string;
    template: CloudFormationTemplate;
    parameters: Array<{ ParameterKey: string; ParameterValue: string }>;
    tags: Array<{ Key: string; Value: string }>;
  }) => Promise<unknown>;
  get: (stackName: string) => Promise<SharedStackDetails | undefined>;
  update: (input: {
    stackName: string;
    template: CloudFormationTemplate;
    parameters: Array<{ ParameterKey: string; ParameterValue: string }>;
    tags: Array<{ Key: string; Value: string }>;
  }) => Promise<unknown>;
};

type SharedStackAction = 'create' | 'upgrade' | 'reuse';

const sharedStackError = ({
  cause,
  code,
  hints,
  message
}: {
  cause?: unknown;
  code: string;
  hints: string | string[];
  message: string;
}) => new CliError({ category: 'CLOUDFORMATION', cause, code, hints, message });

const IN_PROGRESS_SUFFIXES = ['_IN_PROGRESS', '_CLEANUP_IN_PROGRESS'];
const isInProgress = (status?: string) => IN_PROGRESS_SUFFIXES.some((suffix) => status?.endsWith(suffix));
const isReady = (status?: string) => status === 'CREATE_COMPLETE' || status === 'UPDATE_COMPLETE';
const isAlreadyExists = (error: unknown) =>
  (error as { name?: string }).name === 'AlreadyExistsException' ||
  /already exists/i.test((error as { message?: string }).message ?? '');
const isUpdateRace = (error: unknown) =>
  /(?:is in .*_IN_PROGRESS state|already exists|operation in progress)/i.test(
    (error as { message?: string }).message ?? ''
  );
const isNoUpdate = (error: unknown) =>
  /No updates are to be performed/i.test((error as { message?: string }).message ?? '');

const getOutput = (stack: SharedStackDetails, key: string) =>
  stack.Outputs?.find(({ OutputKey }) => OutputKey === key)?.OutputValue;

const stackParameters = (parameters: Record<string, string>) =>
  Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ParameterKey, ParameterValue]) => ({ ParameterKey, ParameterValue }));

const stackTags = (requirement: SharedStackRequirement) => [
  { Key: 'stacktape:shared-resource-kind', Value: requirement.kind },
  { Key: 'stacktape:shared-resource-ownership-key', Value: requirement.ownershipKey },
  { Key: 'stacktape:shared-resource-contract-version', Value: `${requirement.contractVersion}` }
];

const mergeStackParameters = (
  requirement: SharedStackRequirement,
  existing: Record<string, string>
): Record<string, string> => {
  if (!requirement.mergeParameters) return requirement.parameters;
  try {
    return requirement.mergeParameters({ desired: requirement.parameters, existing });
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw sharedStackError({
      cause: error,
      code: 'SHARED_STACK_PARAMETER_MERGE_FAILED',
      message: `Could not reconcile shared stack \`${requirement.stackName}\` parameters.`,
      hints: 'Resolve the conflicting shared-resource configuration, then retry.'
    });
  }
};

export class SharedResourceStackManager {
  readonly #adapter: SharedResourceStackAdapter;
  readonly #pollIntervalMs: number;
  readonly #maxWaitMs: number;
  readonly #wait: (milliseconds: number) => Promise<void>;

  constructor({
    adapter,
    maxWaitMs = 10 * 60_000,
    pollIntervalMs = 4_000,
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
  }: {
    adapter: SharedResourceStackAdapter;
    maxWaitMs?: number;
    pollIntervalMs?: number;
    wait?: (milliseconds: number) => Promise<void>;
  }) {
    this.#adapter = adapter;
    this.#maxWaitMs = maxWaitMs;
    this.#pollIntervalMs = pollIntervalMs;
    this.#wait = wait;
  }

  ensureAll = async (requirements: SharedStackRequirement[]) => {
    const unique = new Map<string, SharedStackRequirement>();
    for (const requirement of requirements) {
      const existing = unique.get(requirement.stackName);
      if (
        existing &&
        (existing.ownershipKey !== requirement.ownershipKey ||
          existing.kind !== requirement.kind ||
          existing.contractVersion !== requirement.contractVersion ||
          existing.roleArn !== requirement.roleArn ||
          JSON.stringify(existing.parameters) !== JSON.stringify(requirement.parameters) ||
          JSON.stringify(existing.template) !== JSON.stringify(requirement.template))
      ) {
        throw sharedStackError({
          code: 'SHARED_STACK_DEFINITION_CONFLICT',
          message: `Shared stack \`${requirement.stackName}\` was requested with conflicting definitions.`,
          hints: 'Declare each shared resource once with one canonical configuration.'
        });
      }
      unique.set(requirement.stackName, requirement);
    }
    return Promise.all([...unique.values()].map((requirement) => this.ensure(requirement)));
  };

  ensure = async (requirement: SharedStackRequirement): Promise<{ action: SharedStackAction; stackName: string }> => {
    let existing = await this.#adapter.get(requirement.stackName);
    if (existing) {
      existing = await this.#waitUntilStable(requirement.stackName, existing);
      return this.#reuseOrUpdate(requirement, existing);
    }

    try {
      await requirement.beforeCreate();
    } catch (error) {
      const racedStack = await this.#findRacedStack(requirement.stackName);
      if (!racedStack) {
        if (error instanceof CliError) throw error;
        throw sharedStackError({
          cause: error,
          code: 'SHARED_STACK_PRECREATE_CHECK_FAILED',
          message: `Could not verify whether shared stack \`${requirement.stackName}\` can be created.`,
          hints: 'Check the underlying AWS resource and retry the deployment.'
        });
      }
      const stableStack = await this.#waitUntilStable(requirement.stackName, racedStack);
      return this.#reuseOrUpdate(requirement, stableStack);
    }
    try {
      await this.#adapter.create({
        roleArn: requirement.roleArn,
        stackName: requirement.stackName,
        template: requirement.template,
        parameters: stackParameters(requirement.parameters),
        tags: stackTags(requirement)
      });
    } catch (error) {
      if (!isAlreadyExists(error)) {
        throw sharedStackError({
          cause: error,
          code: 'SHARED_STACK_CREATE_FAILED',
          message: `Could not create shared stack \`${requirement.stackName}\`.`,
          hints: 'Review the CloudFormation failure, correct it, and retry the deployment.'
        });
      }
      const racedStack = await this.#adapter.get(requirement.stackName);
      if (!racedStack) {
        throw sharedStackError({
          cause: error,
          code: 'SHARED_STACK_CREATE_RACE_UNRESOLVED',
          message: `Shared stack \`${requirement.stackName}\` was created concurrently but could not be read.`,
          hints: 'Wait for the concurrent CloudFormation operation to become visible, then retry.'
        });
      }
      const stableStack = await this.#waitUntilStable(requirement.stackName, racedStack);
      return this.#reuseOrUpdate(requirement, stableStack);
    }
    const createdStack = await this.#findRacedStack(requirement.stackName);
    if (!createdStack) {
      throw sharedStackError({
        code: 'SHARED_STACK_READ_AFTER_CREATE_FAILED',
        message: `Shared stack \`${requirement.stackName}\` was created but could not be read back.`,
        hints: 'Check the stack in CloudFormation, wait for it to become visible, then retry.'
      });
    }
    const stableCreatedStack = await this.#waitUntilStable(requirement.stackName, createdStack);
    this.#validateOwnership(requirement, stableCreatedStack);
    return { action: 'create', stackName: requirement.stackName };
  };

  #reuseOrUpdate = async (
    requirement: SharedStackRequirement,
    existing: SharedStackDetails,
    raceAttempt = 0
  ): Promise<{ action: SharedStackAction; stackName: string }> => {
    this.#validateOwnership(requirement, existing);
    const existingVersion = Number(getOutput(existing, 'ContractVersion'));
    const existingParameters = Object.fromEntries(
      (existing.Parameters ?? [])
        .filter(({ ParameterKey, ParameterValue }) => ParameterKey !== undefined && ParameterValue !== undefined)
        .map(({ ParameterKey, ParameterValue }) => [ParameterKey as string, ParameterValue as string])
    );
    const effectiveParameters = mergeStackParameters(requirement, existingParameters);
    const parametersMatch =
      JSON.stringify(stackParameters(effectiveParameters)) === JSON.stringify(stackParameters(existingParameters));
    if (
      existingVersion > requirement.contractVersion ||
      (existingVersion === requirement.contractVersion && parametersMatch)
    ) {
      return { action: 'reuse', stackName: requirement.stackName };
    }

    if (existing.RoleARN !== requirement.roleArn) {
      throw sharedStackError({
        code: 'SHARED_STACK_ROLE_MISMATCH',
        message: `Shared stack \`${requirement.stackName}\` uses CloudFormation role \`${existing.RoleARN ?? 'none'}\`, but this deployment requested \`${requirement.roleArn ?? 'none'}\`.`,
        hints: existing.RoleARN
          ? `Set \`deploymentConfig.cloudformationRoleArn\` to \`${existing.RoleARN}\`, or explicitly change the shared stack role in CloudFormation before retrying.`
          : 'Remove `deploymentConfig.cloudformationRoleArn`, or explicitly change the shared stack role in CloudFormation before retrying.'
      });
    }

    try {
      await this.#adapter.update({
        stackName: requirement.stackName,
        template: requirement.template,
        parameters: stackParameters(effectiveParameters),
        tags: stackTags(requirement)
      });
    } catch (error) {
      if (isNoUpdate(error)) {
        const unchanged = await this.#adapter.get(requirement.stackName);
        if (!unchanged) {
          throw sharedStackError({
            code: 'SHARED_STACK_DISAPPEARED',
            message: `Shared stack \`${requirement.stackName}\` disappeared during an update.`,
            hints: 'Check CloudFormation for an out-of-band deletion, then retry.'
          });
        }
        const stableUnchanged = await this.#waitUntilStable(requirement.stackName, unchanged);
        this.#validateOwnership(requirement, stableUnchanged);
        const unchangedVersion = Number(getOutput(stableUnchanged, 'ContractVersion'));
        if (unchangedVersion >= requirement.contractVersion) {
          return { action: 'reuse', stackName: requirement.stackName };
        }
        throw sharedStackError({
          code: 'SHARED_STACK_NO_UPDATE_CONTRACT_MISMATCH',
          message: `CloudFormation reported no update for shared stack \`${requirement.stackName}\`, but its contract is still older than required.`,
          hints: 'Inspect the shared stack template and outputs in CloudFormation, then retry.'
        });
      }
      if (!isUpdateRace(error)) {
        throw sharedStackError({
          cause: error,
          code: 'SHARED_STACK_UPDATE_FAILED',
          message: `Could not update shared stack \`${requirement.stackName}\`.`,
          hints: 'Review the CloudFormation failure, correct it, and retry the deployment.'
        });
      }
      if (raceAttempt >= 3) {
        throw sharedStackError({
          cause: error,
          code: 'SHARED_STACK_UPDATE_RACE_EXHAUSTED',
          message: `Shared stack \`${requirement.stackName}\` kept racing with another updater.`,
          hints: 'Wait for the other CloudFormation update to finish, then retry.'
        });
      }
      await this.#waitUntilStable(requirement.stackName);
      const refreshed = await this.#adapter.get(requirement.stackName);
      if (!refreshed) {
        throw sharedStackError({
          code: 'SHARED_STACK_DISAPPEARED',
          message: `Shared stack \`${requirement.stackName}\` disappeared during an update race.`,
          hints: 'Check CloudFormation for an out-of-band deletion, then retry.'
        });
      }
      return this.#reuseOrUpdate(requirement, refreshed, raceAttempt + 1);
    }
    const stableUpdated = await this.#waitUntilStable(requirement.stackName);
    this.#validateOwnership(requirement, stableUpdated);
    const updatedVersion = Number(getOutput(stableUpdated, 'ContractVersion'));
    const updatedParameters = Object.fromEntries(
      (stableUpdated.Parameters ?? [])
        .filter(({ ParameterKey, ParameterValue }) => ParameterKey !== undefined && ParameterValue !== undefined)
        .map(({ ParameterKey, ParameterValue }) => [ParameterKey as string, ParameterValue as string])
    );
    const updatedEffectiveParameters = mergeStackParameters(requirement, updatedParameters);
    const updateSatisfied =
      updatedVersion > requirement.contractVersion ||
      (updatedVersion === requirement.contractVersion &&
        JSON.stringify(stackParameters(updatedEffectiveParameters)) ===
          JSON.stringify(stackParameters(updatedParameters)));
    if (updateSatisfied) return { action: 'upgrade', stackName: requirement.stackName };
    if (raceAttempt >= 3) {
      throw sharedStackError({
        code: 'SHARED_STACK_UPDATE_RACE_EXHAUSTED',
        message: `Shared stack \`${requirement.stackName}\` kept completing without satisfying the requested contract.`,
        hints: 'Wait for other deployments using this shared resource to finish, then retry.'
      });
    }
    return this.#reuseOrUpdate(requirement, stableUpdated, raceAttempt + 1);
  };

  #validateOwnership = (requirement: SharedStackRequirement, stack: SharedStackDetails) => {
    if (!isReady(stack.StackStatus)) {
      throw sharedStackError({
        code: 'SHARED_STACK_FAILED_STATE',
        message: `Shared stack \`${requirement.stackName}\` is in failed or unsupported state \`${stack.StackStatus ?? 'unknown'}\`.`,
        hints: 'Resolve the stack failure in CloudFormation before deploying again.'
      });
    }
    const kind = getOutput(stack, 'ResourceKind');
    const ownershipKey = getOutput(stack, 'OwnershipKey');
    const version = Number(getOutput(stack, 'ContractVersion'));
    if (kind !== requirement.kind || ownershipKey !== requirement.ownershipKey || !Number.isInteger(version)) {
      throw sharedStackError({
        code: 'SHARED_STACK_FOREIGN',
        message: `CloudFormation stack \`${requirement.stackName}\` is not the Stacktape-owned \`${requirement.kind}\` stack for \`${requirement.ownershipKey}\`.`,
        hints: 'Rename or remove the foreign stack only after verifying its ownership; Stacktape will not modify it.'
      });
    }
  };

  #waitUntilStable = async (stackName: string, initial?: SharedStackDetails): Promise<SharedStackDetails> => {
    let stack = initial ?? (await this.#adapter.get(stackName));
    let elapsed = 0;
    while (stack && isInProgress(stack.StackStatus) && elapsed < this.#maxWaitMs) {
      await this.#wait(this.#pollIntervalMs);
      elapsed += this.#pollIntervalMs;
      stack = await this.#adapter.get(stackName);
    }
    if (!stack) {
      throw sharedStackError({
        code: 'SHARED_STACK_DISAPPEARED',
        message: `Shared stack \`${stackName}\` disappeared while waiting for CloudFormation.`,
        hints: 'Check CloudFormation for an out-of-band deletion, then retry.'
      });
    }
    if (isInProgress(stack.StackStatus)) {
      throw sharedStackError({
        code: 'SHARED_STACK_WAIT_TIMEOUT',
        message: `Timed out waiting for shared stack \`${stackName}\` (current state: \`${stack.StackStatus}\`).`,
        hints: 'Wait for the CloudFormation operation to finish, then retry.'
      });
    }
    if (!isReady(stack.StackStatus)) {
      throw sharedStackError({
        code: 'SHARED_STACK_FAILED_STATE',
        message: `Shared stack \`${stackName}\` is in failed state \`${stack.StackStatus ?? 'unknown'}\`.`,
        hints: 'Resolve the stack failure in CloudFormation before deploying again.'
      });
    }
    return stack;
  };

  #findRacedStack = async (stackName: string) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const stack = await this.#adapter.get(stackName);
      if (stack) return stack;
      await this.#wait(this.#pollIntervalMs);
    }
    return undefined;
  };
}
