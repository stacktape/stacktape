import { resolveAwsServiceName } from '@stacktape/aws-read-only/operations';
import { CliError } from '@utils/errors';

/** CloudFormation reads that name one stack by `StackName`: what diagnosing a stack's failed first deployment needs. */
const FAILED_STACK_OPERATIONS = new Set([
  'DescribeChangeSet',
  'DescribeStackEvents',
  'DescribeStackResource',
  'DescribeStackResources',
  'DescribeStacks',
  'GetTemplate',
  'ListChangeSets',
  'ListStackResources'
]);

/**
 * A stack whose first deployment failed before it created Stacktape's outputs has no stack overview and no debug role.
 * CloudFormation still holds why it failed, so CloudFormation reads of exactly that stack are accepted with the
 * caller's own credentials; every other read needs the overview and is refused.
 */
export const scopeToStackWithoutOutputs = ({
  service,
  command,
  input,
  stackName,
  stackId
}: {
  service: string;
  command: string;
  input: Record<string, unknown>;
  stackName: string;
  stackId?: string;
}): Record<string, unknown> => {
  const operation = command.endsWith('Command') ? command.slice(0, -'Command'.length) : command;
  if (resolveAwsServiceName(service) !== 'cloudformation' || !FAILED_STACK_OPERATIONS.has(operation)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_STACK_HAS_NO_OUTPUTS',
      message: `Stack ${stackName} has no Stacktape outputs: its first deployment failed before it created them. Only CloudFormation reads of this stack work until it deploys.`,
      hints: `Read why it failed with service cloudformation and command DescribeStackEvents. Accepted: ${[...FAILED_STACK_OPERATIONS].join(', ')}.`
    });
  }
  const requested = input.StackName;
  if (requested !== undefined && requested !== stackName && requested !== stackId) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_STACK_NOT_TARGET',
      message: `This call reads stack ${stackName}, not ${String(requested)}.`,
      hints: 'Leave out StackName, or pass the name or ID of this stack.'
    });
  }
  return { ...input, StackName: requested ?? stackId ?? stackName };
};
