/**
 * Copyable stack commands shown by the wizard.
 *
 * A stack-targeted command must name all four pieces of context. The generated configuration does
 * contain the project name, but repeating it here makes a pasted destructive command reviewable
 * on its own and prevents a persisted CLI default from silently selecting another stack.
 */
type StackCommandTarget = {
  configPath: string;
  projectName: string;
  stage: string;
  region: string;
};

const quoteArgument = (argument: string): string => (argument.includes(' ') ? `"${argument}"` : argument);

export const stackCommand = (action: 'deploy' | 'delete', target: StackCommandTarget): string =>
  [
    'stacktape',
    action,
    '--configPath',
    target.configPath,
    '--projectName',
    target.projectName,
    '--stage',
    target.stage,
    '--region',
    target.region
  ]
    .map(quoteArgument)
    .join(' ');
