import type { StacktapeArgs, StacktapeCommand } from 'src/config/cli/types';
import { consoleOnlyCommands } from 'src/config/cli/commands';
import { publicCommandName } from 'src/config/cli/public-names';
import { CliError } from '@utils/errors';

/**
 * Why a command needs the Stacktape Console, or undefined when it also works without an account. Stack commands run
 * account-free on local AWS credentials; only Console features need a Stacktape API key.
 */
export const consoleOnlyReason = ({
  command,
  args
}: {
  command: StacktapeCommand;
  args: StacktapeArgs;
}): string | undefined => {
  if (command === 'deploy' && (args as { runner?: string }).runner === 'ec2') {
    return 'remote runners run in the Stacktape Console';
  }
  return consoleOnlyCommands[command];
};

/**
 * Who a session started from this machine belongs to, in AWS role session names and SSM session reasons: the Console
 * user, or without the Console the random install ID. Both fit the role session name alphabet.
 */
export const localSessionUserId = ({ userId, installId }: { userId?: string; installId: string }) =>
  userId ?? `install-${installId}`;

/** The command as it is typed: `deploy --runner ec2` for the remote runner. */
export const consoleOnlyInvocation = (command: StacktapeCommand) =>
  command === 'deploy' ? 'deploy --runner ec2' : publicCommandName(command);

export const consoleSignInRequiredError = ({ invocation, reason }: { invocation: string; reason: string }) => {
  return new CliError({
    category: 'API_KEY',
    code: 'CONSOLE_SIGN_IN_REQUIRED',
    message: `stacktape ${invocation} needs the Stacktape Console, because ${reason}.`,
    hints: [
      'Sign in with `stacktape login`, or set STACKTAPE_API_KEY in CI.',
      'To also add the stacks of your AWS account to the Console, run `stacktape connect`. Nothing is redeployed.'
    ]
  });
};
