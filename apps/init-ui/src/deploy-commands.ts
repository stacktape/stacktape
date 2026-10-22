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
  /** The connected AWS account the wizard was started with, when it was named. */
  awsAccount?: string | undefined;
};

export const quoteArgument = (argument: string): string => (argument.includes(' ') ? `"${argument}"` : argument);

export const stackCommand = (action: 'deploy' | 'delete' | 'stack recover', target: StackCommandTarget): string =>
  [
    'stacktape',
    ...action.split(' '),
    '--config',
    target.configPath,
    '--project',
    target.projectName,
    '--stage',
    target.stage,
    '--region',
    target.region,
    ...(target.awsAccount === undefined ? [] : ['--aws-account', target.awsAccount])
  ]
    .map(quoteArgument)
    .join(' ');
