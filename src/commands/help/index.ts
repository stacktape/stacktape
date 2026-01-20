import type { StacktapeCommand } from '../../config/cli/commands';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import orderBy from 'lodash/orderBy';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { cliCommands } from '../../config/cli/commands';
import { getCommandInfo } from '../../config/cli/utils';

marked.use(
  markedTerminal({
    // reflowText: true,
    // width: 70,
    showSectionPrefix: false,
    tab: 2,
    firstHeading: tuiManager.makeBold.bind(tuiManager)
  })
);

const logHints = ({ showOptionsHint }: { showOptionsHint: boolean }) => {
  console.info(`\n${tuiManager.makeBold('Hints:')}\n`);
  if (showOptionsHint) {
    console.info(
      `  To show available options for selected command, use \`${tuiManager.colorize(
        'yellow',
        'stacktape help --command'
      )} <command>\``
    );
  }
  console.info(`  For more information about CLI, visit ${tuiManager.getLink('docsCli', 'CLI Documentation')}`);
  console.info(`  To see the full documentation, visit ${tuiManager.getLink('docs', 'Stacktape Docs')}`);
};

const logUsage = ({ command }: { command: StacktapeCommand }) => {
  console.info(
    `\n${tuiManager.makeBold('Usage')}:\n\n  ${tuiManager.colorize('yellow', 'stacktape')} (or ${tuiManager.colorize(
      'yellow',
      'stp'
    )}) ${command ? tuiManager.colorize('yellow', command) : '[command]'} ${tuiManager.colorize(
      'gray',
      '--option'
    )} [option value]`
  );
};

const getDescription = (desc: string) => {
  return marked(
    desc
      .replace('---', '')
      .replace('####', '#')
      .trim()
      .split('\n')
      .map((l) => `  ${l}`)
      .join('\n')
      .trimEnd()
  ).replaceAll('*', '>');
};

const getSortedCliArgs = (
  command: StacktapeCommand
): { argName: string; description?: string; required: boolean }[] => {
  const commandInfo = getCommandInfo(command);
  return orderBy(
    Object.entries(commandInfo.args).map(([argName, argData]) => ({
      argName,
      description: argData.description,
      required: argData.required
    })),
    ['required'],
    ['desc']
  );
};

export const commandHelp = async () => {
  const command = globalStateManager.args.command as StacktapeCommand | undefined;
  if (command) {
    logUsage({ command });
    console.info(`\n${tuiManager.makeBold('Options:\n')}`);
    const lines: string[] = [];
    for (const cliArg of getSortedCliArgs(command)) {
      lines.push(
        `${tuiManager.makeBold(tuiManager.colorize('yellow', cliArg.argName))} ${
          cliArg.required ? '(required)' : ''
        }\n  ${getDescription(cliArg.description || '')}`
      );
    }
    console.info(lines.join('\n'));
    logHints({ showOptionsHint: false });
  } else {
    logUsage({ command: null as any });
    console.info(`\n${tuiManager.makeBold('Available commands:\n')}`);

    const lines: string[] = [];
    for (const commandName of cliCommands) {
      const commandInfo = getCommandInfo(commandName);
      lines.push(
        `${tuiManager.makeBold(tuiManager.colorize('yellow', commandName))}\n  ${getDescription(commandInfo.description)}`
      );
    }
    console.info(lines.join('\n'));
    logHints({ showOptionsHint: true });
  }
};
