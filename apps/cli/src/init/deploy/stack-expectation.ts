/**
 * Bind an init-wizard deploy to the CloudFormation target the user consented to.
 *
 * The browser check is only explanatory UI. This contract is enforced again inside the deploy
 * child, after that child has loaded the credentials it will actually use and described the stack.
 */

import type { Stack } from '@aws-sdk/client-cloudformation';
import { CliError } from '@utils/errors';
import { getStackName, getStacktapeStackInfoFromTemplateDescription } from '@stacktape/naming/stacks';
import { tagNames } from '@stacktape/naming/tag-names';

export const INIT_TARGET_CHECK_ENV = 'STACKTAPE_INIT_TARGET_CHECK';
export const INIT_TARGET_EXPECTATION_ENV = 'STACKTAPE_INIT_TARGET_EXPECTATION';
export const INIT_TARGET_SCHEMA_VERSION = 'stacktape.init-target.v1' as const;

const UPDATEABLE_STATUSES: ReadonlySet<string> = new Set([
  'CREATE_COMPLETE',
  'UPDATE_COMPLETE',
  'UPDATE_ROLLBACK_COMPLETE',
  'UPDATE_FAILED',
  'IMPORT_COMPLETE',
  'IMPORT_ROLLBACK_COMPLETE'
]);

type TargetIdentity = {
  schemaVersion: typeof INIT_TARGET_SCHEMA_VERSION;
  accountId: string;
  stackName: string;
  projectName: string;
  stage: string;
  region: string;
};

export type DeployTargetObservation = TargetIdentity &
  (
    | { status: 'absent' }
    | {
        status: 'updateable';
        stackId: string;
        stackStatus: string;
        createdAt?: string;
        updatedAt?: string;
      }
    | {
        status: 'blocked';
        reason: 'foreign-stack' | 'identity-mismatch' | 'unsafe-status' | 'incomplete-stack-data';
        stackId?: string;
        stackStatus?: string;
      }
  );

export type DeployTargetExpectation =
  | (TargetIdentity & { expected: 'create' })
  | (TargetIdentity & { expected: 'update'; stackId: string });

const tagValue = (stack: Stack, key: string): string | undefined => stack.Tags?.find((tag) => tag.Key === key)?.Value;

/** Pure classification shared by the browser probe and the mutation-time assertion. */
export const classifyDeployTarget = ({
  accountId,
  projectName,
  stage,
  region,
  stack
}: {
  accountId: string;
  projectName: string;
  stage: string;
  region: string;
  stack: Stack | null | undefined;
}): DeployTargetObservation => {
  const identity: TargetIdentity = {
    schemaVersion: INIT_TARGET_SCHEMA_VERSION,
    accountId,
    stackName: getStackName(projectName, stage),
    projectName,
    stage,
    region
  };
  if (stack == null) return { ...identity, status: 'absent' };

  const stackId = stack.StackId;
  const stackStatus = stack.StackStatus;
  if (stackId === undefined || stackStatus === undefined || stack.StackName !== identity.stackName) {
    return {
      ...identity,
      status: 'blocked',
      reason: 'incomplete-stack-data',
      ...(stackId === undefined ? {} : { stackId }),
      ...(stackStatus === undefined ? {} : { stackStatus })
    };
  }

  const described = getStacktapeStackInfoFromTemplateDescription(stack.Description ?? '');
  if (described.projectName === '' || described.stage === '') {
    return { ...identity, status: 'blocked', reason: 'foreign-stack', stackId, stackStatus };
  }
  const taggedProject = tagValue(stack, tagNames.projectName());
  const taggedStage = tagValue(stack, tagNames.stage());
  if (
    described.projectName !== projectName ||
    described.stage !== stage ||
    taggedProject !== projectName ||
    taggedStage !== stage
  ) {
    return { ...identity, status: 'blocked', reason: 'identity-mismatch', stackId, stackStatus };
  }
  if (!UPDATEABLE_STATUSES.has(stackStatus)) {
    return { ...identity, status: 'blocked', reason: 'unsafe-status', stackId, stackStatus };
  }
  return {
    ...identity,
    status: 'updateable',
    stackId,
    stackStatus,
    ...(stack.CreationTime === undefined ? {} : { createdAt: stack.CreationTime.toISOString() }),
    ...(stack.LastUpdatedTime === undefined ? {} : { updatedAt: stack.LastUpdatedTime.toISOString() })
  };
};

const expectationError = (message: string): never => {
  throw new CliError({
    category: 'STACK',
    code: 'INIT_STACK_EXPECTATION_MISMATCH',
    message,
    hints: 'Return to the init wizard and review the freshly checked stack target before deploying.'
  });
};

export const parseDeployTargetExpectation = (raw: string | undefined): DeployTargetExpectation | undefined => {
  if (raw === undefined || raw === '') return undefined;
  try {
    const value = JSON.parse(raw) as Partial<DeployTargetExpectation>;
    const nonEmptyString = (candidate: unknown): candidate is string =>
      typeof candidate === 'string' && candidate.trim().length > 0;
    if (
      value.schemaVersion !== INIT_TARGET_SCHEMA_VERSION ||
      !nonEmptyString(value.accountId) ||
      !nonEmptyString(value.stackName) ||
      !nonEmptyString(value.projectName) ||
      !nonEmptyString(value.stage) ||
      !nonEmptyString(value.region) ||
      (value.expected !== 'create' && value.expected !== 'update') ||
      (value.expected === 'update' && !nonEmptyString(value.stackId))
    ) {
      return expectationError('The init deploy target expectation is malformed.');
    }
    return value as DeployTargetExpectation;
  } catch (error) {
    if (error instanceof CliError) throw error;
    return expectationError('The init deploy target expectation is not valid JSON.');
  }
};

/** Refuse any create/update transition other than the exact observation the user approved. */
export const assertDeployTargetExpectation = ({
  expectation,
  observation
}: {
  expectation: DeployTargetExpectation | undefined;
  observation: DeployTargetObservation;
}): void => {
  // Ordinary CLI deploys retain their existing interactive/change-plan behavior. The additional
  // expectation exists only for the init wizard's noninteractive child.
  if (expectation === undefined) return;
  for (const key of ['accountId', 'stackName', 'projectName', 'stage', 'region'] as const) {
    if (expectation[key] !== observation[key]) {
      return expectationError(`The deploy target changed (${key}) after it was reviewed.`);
    }
  }
  if (observation.status === 'blocked') {
    return expectationError('The target stack is not safe for this wizard to modify.');
  }
  if (expectation.expected === 'create') {
    if (observation.status !== 'absent') {
      return expectationError('A stack now exists where a new stack was approved.');
    }
    return;
  }
  if (expectation.expected === 'update') {
    if (observation.status !== 'updateable' || observation.stackId !== expectation.stackId) {
      return expectationError('The existing stack is not the same stack that was approved for update.');
    }
    return;
  }
};
