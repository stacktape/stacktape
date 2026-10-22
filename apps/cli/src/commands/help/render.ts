import { cliCommands, type StacktapeCommand } from '../../config/cli/commands';
import {
  commandPositionals,
  globalArgs,
  hiddenArgs,
  publicCommandName,
  publicFlag,
  resolveCommandName,
  shortFlags
} from '../../config/cli/public-names';
import { getCommandInfo } from '../../config/cli/utils';
import { projectSettingsForCommand } from '../../domain/config-manager/project-settings';
import { CliError } from '../../utils/errors';

const groups: Record<string, readonly string[]> = {
  Daily: ['init', 'dev', 'dev stop', 'deploy', 'diff', 'rollback', 'delete', 'validate', 'synth', 'package', 'status'],
  Debug: ['logs', 'metrics', 'stack', 'incident', 'error', 'alarm', 'container', 'bastion', 'aws'],
  Data: ['query', 'bucket', 'param', 'script', 'deployment-script'],
  Secrets: ['secret'],
  Account: [
    'login',
    'logout',
    'whoami',
    'org',
    'project',
    'aws-profile',
    'defaults',
    'domain',
    'upgrade',
    'version',
    'help'
  ],
  'Coding agents': ['mcp', 'ai']
};
const summary = (description: string) => description.split('\n')[0].replace(/`/g, '');
// Option descriptions start with a `#### Title` line and a `---` separator; the help row shows the first sentence after them.
const argDescription = (description?: string) => (description ?? '').replace(/^####[^\n]*\n+(?:---\n+)?/, '');
const globalHelp = [
  'Global options:',
  '  -h, --help               Show help for a command or group',
  '  -v, --version            Print the CLI version',
  '      --json               Emit NDJSON (does not confirm operations)',
  '      --debug              Show debug messages',
  '      --quiet              Hide progress, banners and hints; output, warnings and errors stay',
  '      --log-level <level>  info, debug or error'
];
const commandRow = (id: StacktapeCommand) =>
  `  ${publicCommandName(id).padEnd(25)} ${summary(getCommandInfo(id).description)}`;

export const renderHelp = (path?: string): string[] => {
  const command = path ? resolveCommandName(path, cliCommands) : undefined;
  const name = command ? publicCommandName(command) : path;
  const children = name ? cliCommands.filter((id) => publicCommandName(id).startsWith(`${name} `)) : [];
  if (path && !command && !children.length)
    throw new CliError({
      category: 'CLI',
      code: 'CLI_COMMAND_UNKNOWN',
      message: `Unknown command or group: ${path}.`,
      hints: 'Run stacktape help.'
    });
  if (!path) {
    const lines = ['Usage: stacktape <command> [options]', ''];
    for (const [group, names] of Object.entries(groups)) {
      lines.push(
        `${group}:`,
        ...cliCommands
          .filter(
            (id) =>
              id !== 'cf-module:update' &&
              names.some((prefix) => publicCommandName(id) === prefix || publicCommandName(id).startsWith(`${prefix} `))
          )
          .map(commandRow),
        ''
      );
    }
    return [
      ...lines,
      ...globalHelp,
      '',
      'Run stacktape help <command> for arguments and options.',
      'Documentation: https://docs.stacktape.com/cli/'
    ];
  }
  const info = command ? getCommandInfo(command) : undefined;
  const positionals = command ? (commandPositionals[command] ?? []) : [];
  const lines = [
    `Usage: stacktape ${name}${positionals.map((arg) => ` ${info?.args[arg]?.required ? `<${publicFlag(arg)}>` : `[${publicFlag(arg)}]`}`).join('')} [options]`,
    ''
  ];
  if (info) lines.push(summary(info.description), '');
  if (children.length) lines.push('Commands:', ...children.map(commandRow), '');
  if (info) {
    if (positionals.length)
      lines.push(
        'Arguments:',
        ...positionals.map(
          (arg) => `  ${publicFlag(arg).padEnd(25)} ${summary(argDescription(info.args[arg]?.description))}`
        ),
        ''
      );
    lines.push('Options:');
    const fromConfig = command ? projectSettingsForCommand(command) : [];
    for (const [arg, metadata] of Object.entries(info.args)) {
      if (hiddenArgs.has(arg) || globalArgs.has(arg)) continue;
      const label = `${shortFlags[arg] ? `-${shortFlags[arg]}, ` : '    '}--${publicFlag(arg)}${metadata.allowedTypes.includes('boolean') ? '' : ` <${arg === 'stage' ? 'name' : metadata.allowedTypes.includes('number') ? 'number' : 'value'}>`}`;
      const desc = summary(argDescription(metadata.description));
      // Inside a project, the config's `projectName` and `region` settings supply these.
      const settable = fromConfig.includes(arg as 'projectName' | 'region');
      const note = metadata.required
        ? settable
          ? ' (required unless set in the config)'
          : ' (required)'
        : settable
          ? ' (default: from the config)'
          : '';
      lines.push(`  ${label.padEnd(32)} ${desc}${note}`);
    }
    lines.push('');
  }
  return [...lines, ...globalHelp, '', 'Documentation: https://docs.stacktape.com/cli/'];
};
