import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeControlPlaneOperation } from '../_utils/initialization';
import { buildInfoStackAgentResult, type InfoStackAgentResultV1 } from './agent-contract';

export const resolveInfoStackName = ({
  projectName,
  stackName,
  stage
}: {
  projectName?: string;
  stackName?: string;
  stage?: string;
}) => {
  if (stackName) {
    return stackName;
  }
  if (projectName && stage) {
    return `${projectName}-${stage}`;
  }
  throw new CliError({
    category: 'CLI',
    code: 'CLI_STACK_TARGET_REQUIRED',
    message: 'A stack target is required.',
    hints: 'Provide `--stackName`, or provide both `--projectName` and `--stage`.'
  });
};

const printStackDetails = ({
  stackName,
  region,
  details
}: {
  stackName: string;
  region: string;
  details: Pick<InfoStackAgentResultV1, 'description' | 'resources' | 'stackInfoMap' | 'stackOutput'>;
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
      const status = typeof res.ResourceStatus === 'string' ? res.ResourceStatus : 'N/A';
      const logicalId = typeof res.LogicalResourceId === 'string' ? res.LogicalResourceId : 'N/A';
      const resourceType = typeof res.ResourceType === 'string' ? res.ResourceType : 'N/A';
      const statusColor = status.includes('COMPLETE') ? 'green' : status.includes('FAILED') ? 'red' : 'yellow';
      lines.push(`  ${logicalId} (${resourceType}) - ${tuiManager.colorize(statusColor, status)}`);
    }
    if (details.resources.length > 20) {
      lines.push(`  ${tuiManager.colorize('gray', `...and ${details.resources.length - 20} more resources`)}`);
    }
  }

  tuiManager.printLines(lines);
};

export const commandInfoStack = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { stackName, projectName, stage, region, awsAccount } = args;

  const resolvedStackName = resolveInfoStackName({ stackName, projectName, stage });

  const details = await apiClient.stackDetails({
    stackName: resolvedStackName,
    region: region!,
    awsAccountName: awsAccount
  });
  const result = buildInfoStackAgentResult({
    stackName: resolvedStackName,
    region: region!,
    details
  });

  if (!isAgentMode(args)) {
    printStackDetails({ stackName: resolvedStackName, region: region!, details: result });
  }

  return result;
};
