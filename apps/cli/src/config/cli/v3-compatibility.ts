import type { StacktapeCommand } from './types';

/**
 * Stacktape 3.7.1 spellings that existing CI scripts use. v4 runs what they asked for, prints one warning for each, and
 * keeps them out of help. Commands and flags whose feature v4 removed are not aliased: they fail with what to do.
 */

/** 3.7.1 command IDs that v4 renamed without changing what the command does. */
export const renamedV3Commands: Readonly<Record<string, StacktapeCommand>> = {
  'compile-template': 'synth',
  'preview-changes': 'diff',
  'package-workloads': 'package',
  'secret:create': 'secret:set',
  'projects:list': 'project:list',
  'debug:logs': 'logs',
  'debug:metrics': 'metrics',
  'debug:alarms': 'alarms',
  'debug:sql': 'query:sql',
  'debug:dynamodb': 'query:dynamodb',
  'debug:redis': 'query:redis',
  'debug:opensearch': 'query:opensearch',
  'debug:aws-sdk': 'aws:call',
  'debug:container-exec': 'container:exec'
};

/** 3.7.1 command IDs whose feature v4 removed. */
export const removedV3Commands: Readonly<Record<string, string>> = {
  'codebuild:deploy':
    'Stacktape 4 no longer deploys through AWS CodeBuild. Run `stacktape deploy` in your CI job, or set up a runner and run `stacktape deploy --runner ec2`.'
};

type V3Flag =
  /** v4 always does what the flag asked for. `takesValue` flags consume the word after them. */
  | { ignored: string; takesValue?: boolean }
  /** The same option under its v4 name; `negated` flips a boolean. */
  | { renamedTo: string; negated?: boolean; warning: string }
  /** v4 removed what the flag did. */
  | { removed: string };

const v3FlagAliases: Readonly<Record<string, string>> = {
  hs: 'hotSwap',
  ddd: 'disableDriftDetection',
  dar: 'disableAutoRollback',
  ti: 'templateId',
  aa: 'awsAccount'
};

const templateIdRemoved: V3Flag = {
  removed:
    'Stacktape 4 no longer keeps configurations in the Console, so `--templateId` was removed. Commit your configuration file to the repository, pass its path with `--config` if it is not in the project root, and remove `--templateId`.'
};
const awsAccountNotUsed: V3Flag = {
  removed:
    'In Stacktape 4 this command does not use a connected AWS account. When the configuration needs AWS, it uses local AWS credentials (`--profile` or AWS keys in the environment). Remove `--awsAccount`.'
};

const v3FlagsByCommand: Partial<Record<StacktapeCommand, Readonly<Record<string, V3Flag>>>> = {
  deploy: {
    hotSwap: {
      ignored:
        '`--hotSwap` is ignored: Stacktape 4 updates code-only changes without CloudFormation automatically. Pass `--full` to force a CloudFormation deployment.'
    },
    disableDriftDetection: {
      ignored:
        '`--disableDriftDetection` is ignored: Stacktape 4 does not block deploys of stacks changed outside CloudFormation.'
    },
    disableAutoRollback: {
      renamedTo: 'autoRollback',
      negated: true,
      warning:
        '`--disableAutoRollback` is deprecated: use `--auto-rollback=false`. Stacktape 4 does not roll back a failed deploy unless your configuration or `--auto-rollback` asks for it.'
    }
  },
  synth: { awsAccount: awsAccountNotUsed },
  package: { awsAccount: awsAccountNotUsed }
};

/** How v4 treats a 3.7.1 flag that `command` no longer defines, or `undefined` when 3.7.1 had no such flag. */
export const v3Flag = (command: StacktapeCommand, spelling: string): V3Flag | undefined => {
  const name = v3FlagAliases[spelling] ?? spelling;
  if (name === 'templateId') return templateIdRemoved;
  return v3FlagsByCommand[command]?.[name];
};

export const v3CommandWarning = (typed: string, publicName: string) =>
  `\`${typed}\` is the Stacktape 3 name of \`stacktape ${publicName}\`, which ran instead. Use the new name.`;
