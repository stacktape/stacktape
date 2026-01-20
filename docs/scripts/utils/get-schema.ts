import { cliCommands, type StacktapeCommand } from '../../../src/config/cli/commands';
import { getCommandInfo } from '../../../src/config/cli/utils';

const forcedCommandOrder = [
  'deploy',
  'codebuild:deploy',
  'dev',
  'delete',
  'logs',
  'init',
  'stack:list',
  'stack:info',
  'secret:create',
  'secret:get',
  'secret:delete'
];

export const getSortedCliArgsSchema = async (): Promise<
  {
    command: string;
    commandSchema: ReturnType<typeof getCommandInfo>;
  }[]
> => {
  const res: {
    command: string;
    commandSchema: ReturnType<typeof getCommandInfo>;
  }[] = [];

  forcedCommandOrder.forEach((command) => {
    if (cliCommands.includes(command as StacktapeCommand)) {
      res.push({ command, commandSchema: getCommandInfo(command as StacktapeCommand) });
    }
  });

  cliCommands.forEach((command) => {
    if (!res.find((s) => s.command === command)) {
      res.push({ command, commandSchema: getCommandInfo(command) });
    }
  });

  return res;
};
