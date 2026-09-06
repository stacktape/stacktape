import { CliError } from '@utils/errors';

export const assertExistingDevStack = ({ stackName, isDevStack }: { stackName: string; isDevStack: unknown }): void => {
  if (isDevStack === true) return;
  throw new CliError({
    category: 'CLI',
    code: 'CLI_DEV_STACK_CONFLICT',
    message: `Stack \`${stackName}\` exists but is not marked as a dev stack.`,
    hints:
      'Choose an unused development stage. Inspect and recover an existing failed stack explicitly; local startup will never delete it based on its name or status.'
  });
};
