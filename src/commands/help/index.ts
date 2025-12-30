import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@utils/tui';
import orderBy from 'lodash/orderBy';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import commandsInfo from '../../../@generated/schemas/cli-schema.json' with { type: 'json' };

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

const getSortedCliArgs = (command: StacktapeCommand): Record<string, any>[] => {
  return orderBy(
    Object.entries(commandsInfo[command].args).map(([argName, argData]) => ({
      argName,
      ...argData
    })),
    ['required'],
    ['desc']
  );
};

export const commandHelp = async () => {
  const command = globalStateManager.args.command;
  if (command) {
    logUsage({ command: command as StacktapeCommand });
    console.info(`\n${tuiManager.makeBold('Options:\n')}`);
    const lines = [];
    for (const cliArg of getSortedCliArgs(command as StacktapeCliCommand)) {
      const description: string = (cliArg as any).description;
      lines.push(
        `${tuiManager.makeBold(tuiManager.colorize('yellow', cliArg.argName))} ${
          cliArg.required ? '(required)' : ''
        }\n  ${getDescription(description || '')}`
      );
    }
    console.info(lines.join('\n'));
    logHints({ showOptionsHint: false });
  } else {
    logUsage({ command: null });
    console.info(`\n${tuiManager.makeBold('Available commands:\n')}`);

    const lines = [];
    for (const commandName in commandsInfo) {
      const description: string = commandsInfo[commandName].description;
      lines.push(
        `${tuiManager.makeBold(tuiManager.colorize('yellow', commandName))}\n  ${getDescription(description)}`
      );
    }
    console.info(lines.join('\n'));
    logHints({ showOptionsHint: true });
  }
};
