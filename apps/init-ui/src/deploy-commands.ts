import { isDeletionProtectedOnStage } from '@stacktape/config-inference/compose/preferences';

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

/** The command that creates one secret. The value is prompted for, so it never lands in shell history. */
export const secretCommand = (name: string, region: string, awsAccount?: string): string =>
  `stacktape secret set ${name} --region ${region}${awsAccount === undefined ? '' : ` --aws-account ${quoteArgument(awsAccount)}`}`;

/**
 * Resources whose configuration turns deletion protection on for `stage`, by name. A generated database is protected
 * on every stage except pull-request previews.
 *
 * `stacktape delete` refuses a stack that still has one, and it never turns the protection off on
 * its own. The wizard names them so its removal steps can say what to change first.
 */
export const deletionProtectedResources = (
  resources: Record<string, { type: string; properties: Record<string, unknown> }>,
  stage: string
): string[] =>
  Object.entries(resources)
    .filter(([, resource]) => isDeletionProtectedOnStage(resource.properties.deletionProtection, stage))
    .map(([name]) => name);
