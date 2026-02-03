import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { executeAwsSdkCommand, getSupportedServices } from '@domain-services/debug-services/aws-sdk-executor';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { getDebugAgentCredentials, initDebugAgentCredentials } from '../_utils/debug-agent-credentials';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

const READ_ONLY_PREFIXES = ['List', 'Get', 'Describe', 'Head', 'Batch'];

const isReadOnlyCommand = (command: string): boolean => {
  return READ_ONLY_PREFIXES.some((prefix) => command.startsWith(prefix));
};

export const commandDebugAwsSdk = async () => {
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

  if (!service) {
    const supported = getSupportedServices();
    throw new ExpectedError(
      'CLI',
      'Missing required flag: --service',
      `Supported services: ${Object.keys(supported).join(', ')}`
    );
  }

  if (!command) {
    const supported = getSupportedServices();
    const serviceCommands = supported[service.toLowerCase()];
    throw new ExpectedError(
      'CLI',
      'Missing required flag: --command',
      serviceCommands
        ? `Example commands for ${service}: ${serviceCommands.join(', ')}`
        : 'Provide a valid SDK command name'
    );
  }

  // Validate read-only
  if (!isReadOnlyCommand(command)) {
    throw new ExpectedError(
      'CLI',
      `Command "${command}" is not a read-only operation`,
      `debug:aws-sdk only supports read-only operations (${READ_ONLY_PREFIXES.join('*, ')}*)`
    );
  }

  // Parse input JSON
  let inputObj: Record<string, unknown> = {};
  if (input) {
    try {
      inputObj = JSON.parse(input);
    } catch {
      throw new ExpectedError(
        'CLI',
        'Invalid JSON in --input',
        'Provide valid JSON, e.g. --input \'{"Key": "value"}\''
      );
    }
  }

  const awsRegion = region || globalStateManager.region;
  if (!awsRegion) {
    throw new ExpectedError('CLI', 'AWS region not specified', 'Provide --region flag');
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
    throw new ExpectedError('CLI', `AWS SDK error: ${errResult.error}`, errResult.hint);
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
