import type { StacktapeCliArgs } from 'src/config/cli/types';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import {
  AWS_READ_ONLY_OPERATIONS,
  getReadOnlyAwsOperations,
  isReadOnlyAwsCommand,
  resolveAwsServiceName
} from '@domain-services/debug-services/aws-read-only-operations';
import { executeAwsSdkCommand } from '@domain-services/debug-services/aws-sdk-executor';
import { CliError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { getDebugAgentCredentials, initDebugAgentCredentials } from '../_utils/debug-agent-credentials';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';
import { parseJsonObjectArgument } from '../_utils/parse-json-argument';

export const commandAwsCall = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  initDebugAgentCredentials();

  const args = globalStateManager.args as StacktapeCliArgs & {
    service?: string;
    command?: string;
    input?: string;
  };

  const { service, command, input, region } = args;

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
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_SERVICE_UNSUPPORTED',
      message: `Service \`${service}\` has no operations that \`aws:call\` is allowed to send.`,
      hints: `Supported services: ${supportedServices}.`
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

  // The call may run with your own AWS credentials, so this allowlist is the only thing keeping it read-only.
  if (!isReadOnlyAwsCommand(service, command)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_CALL_COMMAND_NOT_ALLOWED',
      message: `Command \`${command}\` is not an accepted read-only operation for service \`${service}\`.`,
      hints: `\`aws:call\` sends only operations reviewed as read-only. Accepted for ${service}: ${acceptedOperations.join(', ')}.`
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

  const awsRegion = region || globalStateManager.region;
  if (!awsRegion) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_REGION_REQUIRED',
      message: 'AWS region is not specified.',
      hints: 'Provide the `--region` flag.'
    });
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

  // Output
  if (isAgentMode()) {
    tuiManager.info(JSON.stringify({ ok: true, service, command, data: result.data }, null, 2));
  } else {
    tuiManager.info(`${service}.${command} result:\n`);
    tuiManager.info(JSON.stringify(result.data, null, 2));
  }

  return null;
};
