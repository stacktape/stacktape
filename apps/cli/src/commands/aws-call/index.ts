import type { StacktapeCliArgs } from 'src/config/cli/types';
import { tuiManager } from '@application-services/tui-manager';
import { executeAwsSdkCommand } from '@stacktape/aws-read-only/executor';
import {
  AWS_READ_ONLY_OPERATIONS,
  describeAwsCallRefusal,
  getReadOnlyAwsOperations,
  resolveAwsServiceName
} from '@stacktape/aws-read-only/operations';
import { CliError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { getDebugAgentCredentials, initDebugAgentCredentials } from '../_utils/debug-agent-credentials';
import {
  captureCommandArgs,
  getStackContext,
  initializeStackServicesForWorkingWithDeployedStack
} from '../_utils/initialization';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { parseJsonObjectArgument } from '../_utils/parse-json-argument';
import { getBatchScope, scopeBatchCall } from '../dev/deployed-batch-job';
import { scopeToStackWithoutOutputs, summarizeStackEvents } from './stack-without-outputs';

const isMissingStackOverview = (error: unknown) => error instanceof CliError && error.category === 'MISSING_OUTPUT';

export const commandAwsCall = async () => {
  let stackWithoutOutputs = false;
  try {
    await initializeStackServicesForWorkingWithDeployedStack({
      commandModifiesStack: false,
      commandRequiresConfig: false
    });
  } catch (error) {
    if (!isMissingStackOverview(error)) throw error;
    stackWithoutOutputs = true;
  }
  const args = captureCommandArgs();
  const stackContext = getStackContext();

  if (!stackWithoutOutputs) initDebugAgentCredentials();

  const commandArgs = args as StacktapeCliArgs & {
    service?: string;
    command?: string;
    input?: string;
  };

  const { service, command, input, region } = commandArgs;

  const supportedServices = Object.keys(AWS_READ_ONLY_OPERATIONS).join(', ');

  if (!service) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_SERVICE_REQUIRED',
      message: 'Missing required flag `--service`.',
      hints: `Supported services: ${supportedServices}.`
    });
  }

  // A service with no reviewed operations is rejected here rather than at the first command, so the message names the
  // real problem.
  if (!resolveAwsServiceName(service)) {
    const refusal = describeAwsCallRefusal(service, command ?? '')!;
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_SERVICE_UNSUPPORTED',
      message: refusal.message,
      hints: refusal.hint
    });
  }

  const acceptedOperations = getReadOnlyAwsOperations(service);

  if (!command) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_COMMAND_REQUIRED',
      message: 'Missing required flag `--command`.',
      hints: `Accepted commands for ${service}: ${acceptedOperations.join(', ')}.`
    });
  }

  // The executor enforces this allowlist for every caller; checking first explains the refusal before credentials load.
  const refusal = describeAwsCallRefusal(service, command);
  if (refusal) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_COMMAND_NOT_ALLOWED',
      message: refusal.message,
      hints: refusal.hint
    });
  }

  // Parse input JSON
  let inputObj: Record<string, unknown> = {};
  if (input) {
    inputObj = parseJsonObjectArgument({
      value: input,
      flag: '--input',
      code: 'CLI_AWS_CALL_INPUT_INVALID',
      example: '--input \'{"Key":"value"}\''
    });
  }

  const awsRegion = region || stackContext.region;
  if (!awsRegion) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_REGION_REQUIRED',
      message: 'AWS region is not specified.',
      hints: 'Provide the `--region` flag.'
    });
  }

  if (stackWithoutOutputs) {
    inputObj = scopeToStackWithoutOutputs({
      service,
      command,
      input: inputObj,
      stackName: stackContext.stackName,
      stackId: stackManager.existingStackDetails?.StackId
    });
  }

  const batchScope =
    resolveAwsServiceName(service) === 'batch'
      ? scopeBatchCall({ command, input: inputObj, scope: getBatchScope(stackManager.existingStackResources) })
      : {};
  if ('refusal' in batchScope) {
    throw new CliError({ category: 'CLI', code: 'CLI_AWS_CALL_COMMAND_NOT_ALLOWED', message: batchScope.refusal });
  }

  // Get credentials (uses debug agent role if available, otherwise user credentials)
  const credentials = await getDebugAgentCredentials();

  const result = await executeAwsSdkCommand(service, command, inputObj, {
    region: awsRegion,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  });

  if (!result.ok) {
    const errResult = result as { ok: false; error: string; hint?: string };
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_FAILED',
      message: `AWS SDK request failed: ${errResult.error}`,
      hints: errResult.hint
    });
  }

  const scoped = batchScope.filterResponse ? batchScope.filterResponse(result.data) : result.data;
  const data =
    stackWithoutOutputs && /^DescribeStackEvents(Command)?$/.test(command) ? summarizeStackEvents(scoped) : scoped;

  // Output
  if (isAgentMode()) {
    tuiManager.info(JSON.stringify({ ok: true, service, command, data }, null, 2));
  } else {
    tuiManager.info(`${service}.${command} result:\n`);
    tuiManager.info(JSON.stringify(data, null, 2));
  }

  return null;
};
