import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import { CliError } from '@utils/errors';

/**
 * Custom resources get 3600 s from CloudFormation and four 900 s Lambda invocations. This leaves time for the task to
 * start, for each invocation to hand over to the next one, and for the answer.
 */
export const MAX_RELEASE_COMMAND_TIMEOUT_SECONDS = 3300;

export type ResolvedReleaseCommand = {
  workload: StpContainerWorkload;
  command: string;
  runWhenChanged: string[];
  timeoutSeconds: number;
  containerName: string;
};

const invalid = (workloadName: string, message: string, hints?: string) =>
  new CliError({
    category: 'CONFIG_VALIDATION',
    code: 'CONFIG_RELEASE_COMMAND_INVALID',
    message: `The release command of \`${workloadName}\` ${message}`,
    ...(hints ? { hints } : {})
  });

export const resolveReleaseCommand = (workload: StpContainerWorkload): ResolvedReleaseCommand | undefined => {
  if (workload.releaseCommand === undefined) return undefined;
  const config =
    typeof workload.releaseCommand === 'string' ? { command: workload.releaseCommand } : workload.releaseCommand;
  const name = workload.nameChain[0] ?? workload.name;
  if (!config.command?.trim()) throw invalid(name, 'is empty.');

  const timeoutSeconds = config.timeout ?? MAX_RELEASE_COMMAND_TIMEOUT_SECONDS;
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > MAX_RELEASE_COMMAND_TIMEOUT_SECONDS) {
    throw invalid(name, `has a timeout of ${timeoutSeconds}.`, `Use whole seconds from 1 to ${MAX_RELEASE_COMMAND_TIMEOUT_SECONDS}.`);
  }

  const containerNames = workload.containers.map((container) => container.name);
  if (!config.container && containerNames.length > 1 && workload.type === 'multi-container-workload') {
    throw invalid(
      name,
      'does not say which container to run in.',
      `Set \`container\` to one of: ${containerNames.join(', ')}.`
    );
  }
  const containerName = config.container ?? containerNames[0]!;
  const container = workload.containers.find(({ name: candidate }) => candidate === containerName);
  if (!container) {
    throw invalid(name, `names a container that does not exist: ${containerName}.`, `Use one of: ${containerNames.join(', ')}.`);
  }
  if (container.essential === false) {
    throw invalid(
      name,
      `runs in \`${containerName}\`, which is not essential.`,
      'Use an essential container: ECS treats the end of an essential container as the end of the task.'
    );
  }
  return {
    workload,
    command: config.command,
    runWhenChanged: config.runWhenChanged ?? [],
    timeoutSeconds,
    containerName
  };
};
