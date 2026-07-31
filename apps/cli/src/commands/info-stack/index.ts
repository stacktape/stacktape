import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';

const printStackDetails = ({
  stackName,
  region,
  details
}: {
  stackName: string;
  region: string;
  details: {
    stackOutput?: { [key: string]: string };
    stackInfoMap?: any;
    resources?: any[];
    description?: string | null;
  };
}) => {
  const lines: string[] = [];

  lines.push(tuiManager.makeBold(`Stack: ${tuiManager.colorize('cyan', stackName)}`));
  lines.push(`Region: ${tuiManager.colorize('cyan', region)}`);
  if (details.description) {
    lines.push(`Description: ${details.description}`);
  }
  lines.push('');

  if (details.stackOutput && Object.keys(details.stackOutput).length > 0) {
    lines.push(tuiManager.makeBold('Stack Outputs:'));
    for (const [key, value] of Object.entries(details.stackOutput)) {
      if (key.startsWith('stp')) continue;
      lines.push(`  ${tuiManager.colorize('cyan', key)}: ${value}`);
    }
    lines.push('');
  }

  if (details.stackInfoMap) {
    lines.push(tuiManager.makeBold('Resources (from stackInfoMap):'));
    const infoMap = details.stackInfoMap;
    for (const [resourceName, resourceInfo] of Object.entries(infoMap)) {
      if (typeof resourceInfo === 'object' && resourceInfo !== null) {
        lines.push(`  ${tuiManager.colorize('cyan', resourceName)}:`);
        const info = resourceInfo as Record<string, any>;
        for (const [propName, propValue] of Object.entries(info)) {
          if (typeof propValue === 'string' || typeof propValue === 'number') {
            lines.push(`    ${propName}: ${propValue}`);
          }
        }
      }
    }
    lines.push('');
  }

  if (details.resources && details.resources.length > 0) {
    lines.push(tuiManager.makeBold('CloudFormation Resources:'));
    const resourcesSummary = details.resources.slice(0, 20);
    for (const res of resourcesSummary) {
      const status = res.ResourceStatus || 'N/A';
      const statusColor = status.includes('COMPLETE') ? 'green' : status.includes('FAILED') ? 'red' : 'yellow';
      lines.push(
        `  ${res.LogicalResourceId || 'N/A'} (${res.ResourceType || 'N/A'}) - ${tuiManager.colorize(statusColor, status)}`
      );
    }
    if (details.resources.length > 20) {
      lines.push(`  ${tuiManager.colorize('gray', `...and ${details.resources.length - 20} more resources`)}`);
    }
  }

  tuiManager.printLines(lines);
};

export const commandInfoStack = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });

  const { stackName, projectName, stage, region, awsAccount } = globalStateManager.args;

  // Derive stackName from projectName-stage if not provided directly
  let resolvedStackName = stackName;
  if (!resolvedStackName) {
    if (projectName && stage) {
      resolvedStackName = `${projectName}-${stage}`;
    } else {
      throw new ExpectedError(
        'CLI',
        'Missing required arguments',
        'Provide either --stackName OR both --projectName and --stage'
      );
    }
  }

  const details = await stacktapeTrpcApiManager.apiClient.stackDetails({
    stackName: resolvedStackName,
    region: region!,
    awsAccountName: awsAccount
  });

  if (isAgentMode()) {
    tuiManager.info(JSON.stringify({ stackName: resolvedStackName, region: region!, ...details }, null, 2));
  } else {
    printStackDetails({ stackName: resolvedStackName, region: region!, details });
  }

  return details;
};
