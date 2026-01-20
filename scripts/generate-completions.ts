import { cliCommands, type StacktapeCommand } from '../src/config/cli/commands';
import { argAliases } from '../src/config/cli/options';
import { getCommandInfo } from '../src/config/cli/utils';
import { writeFile } from 'fs-extra';

// Build a schema-like structure from cli-definition for compatibility
const buildCliSchema = () => {
  const schema: Record<string, { description: string; args: Record<string, any> }> = {};
  for (const cmd of cliCommands) {
    const info = getCommandInfo(cmd);
    schema[cmd] = {
      description: info.description,
      args: Object.fromEntries(
        Object.entries(info.args).map(([argName, argInfo]) => [
          argName,
          {
            description: argInfo.description,
            allowedTypes: argInfo.allowedTypes,
            allowedValues: argInfo.allowedValues,
            alias: argInfo.alias
          }
        ])
      )
    };
  }
  return schema;
};

const cliSchema = buildCliSchema();

export const createZshCompletionScript = ({ scriptTemplate, path }: { scriptTemplate: string; path: string }) => {
  const mainCommands = Object.keys(cliSchema)
    .map((command) => `"${command.replaceAll(':', '\\:')}"\\:"${extractDescription(cliSchema[command].description)}"`)
    .join(' ');
  const commandArgs = Object.keys(cliSchema)
    .map((command) => {
      return `
		"${command}")
			_arguments -s -C \\
				'1: :->cmd' \\
				${zshExtractArgumentLines(cliSchema[command].args)}
				  ret=0
				  ;;
				`;
    })
    .join('\n');
  return writeFile(
    path,
    scriptTemplate.replace('<<MAIN_COMMANDS>>', mainCommands).replace('<<COMMAND_ARGS>>', commandArgs)
  );
};

export const createBashCompletionScript = ({ scriptTemplate, path }: { scriptTemplate: string; path: string }) => {
  const commandSwitches = Object.keys(cliSchema).map((command) => {
    return `
		  "${command}")
			COMPREPLY+=( $(compgen -W "${Object.keys(cliSchema[command].args)
        .map((arg) => `--${arg}`) // ${cliSchema[command].args[arg].alias ? ` --${cliSchema[command].args[arg].alias}` : ''}
        .join(' ')}" -- "$\{cur_word}") )
			return;;`;
  });
  const optionsMap = {};
  Object.keys(cliSchema).forEach((command) => {
    Object.keys(cliSchema[command].args).forEach((arg) => {
      optionsMap[arg] = cliSchema[command].args[arg];
    });
  });
  const optionsSwitches = [];
  Object.keys(optionsMap).forEach((option) => {
    let optionSwitch;
    if (optionsMap[option].allowedTypes.includes('string')) {
      if (optionsMap[option].allowedValues) {
        optionSwitch = `
		  "--${option}")
			COMPREPLY+=( $(compgen -W "${optionsMap[option].allowedValues.join(' ')}" -- "$\{cur_word}") )
			return;;`;
      }
      if (['configPath'].includes(option)) {
        optionSwitch = `
		  "--${option}") _file_arguments "!*.yml" && return;;`;
      }
      if (['outFile'].includes(option)) {
        optionSwitch = `
		  "--${option}")
			COMPREPLY+=( $(compgen -f -- "$\{cur_word}") )
			return;;`;
      }
      if (['projectDirectory', 'initializeProjectTo', 'currentWorkingDirectory'].includes(option)) {
        optionSwitch = `
		  "--${option}")
			COMPREPLY+=( $(compgen -d -- "$\{cur_word}") )
			return;;`;
      }
    }

    if (optionSwitch) {
      optionsSwitches.push(optionSwitch);
      // if (optionsMap[option].alias) {
      //   optionsSwitches.push(optionSwitch.replace(`--${option}`, `--${optionsMap[option].alias}`));
      // }
    }
    return null;
  });

  return writeFile(
    path,
    scriptTemplate
      .replace('<<COMMANDS>>', Object.keys(cliSchema).join(' '))
      .replace('<<COMMAND_SWITCHES>>', commandSwitches.join(''))
      .replace('<<OPTIONS_SWITCHES>>', optionsSwitches.join(''))
  );
};

export const createPowershellCompletionScript = ({
  scriptTemplate,
  path
}: {
  scriptTemplate: string;
  path: string;
}) => {
  const commands = Object.keys(cliSchema);
  const commandsPsString = commands.map((command) => `'${command}'`).join(',');
  const optionsMap = {};
  Object.keys(cliSchema).forEach((command) => {
    Object.keys(cliSchema[command].args).forEach((arg) => {
      optionsMap[arg] = cliSchema[command].args[arg];
    });
  });
  const optionsForCommands: { [key: string]: string[] } = {};
  commands.forEach((command) => {
    const options = [];
    Object.keys(cliSchema[command].args).forEach((arg) => {
      options.push(`'--${arg}'`);
      if (optionsMap[arg].alias) {
        options.push(`'--${optionsMap[arg].alias}'`);
      }
    });
    optionsForCommands[command] = options;
  });

  const optionsForCommandsPsString = `@{${Object.keys(optionsForCommands)
    .map((command) => {
      return `'${command}'= @(${optionsForCommands[command].join(',')})`;
    })
    .join(';')}}`;

  const optionsValues = {};
  Object.keys(optionsMap).forEach((option) => {
    if (optionsMap[option].allowedValues) {
      optionsValues[`--${option}`] = optionsMap[option].allowedValues;
    }
  });

  const optionsValuesPsString = `@{${Object.keys(optionsValues)
    .map((option) => {
      return `'${option}'= @(${optionsValues[option].map((value) => `'${value}'`).join(',')})`;
    })
    .join(';')}}`;

  return writeFile(
    path,
    scriptTemplate
      .replace('<<OPTIONS_FOR_COMMAND>>', optionsForCommandsPsString)
      .replace('<<OPTION_VALUES>>', optionsValuesPsString)
      .replace('<<COMMANDS>>', commandsPsString)
  );
};

const extractDescription = (description) => {
  return (
    description
      ?.substring(5, description.includes('\n') ? description.indexOf('\n') : description.length)
      .replaceAll(/[`'.]/g, '') ?? ''
  );
};

const zshExtractArgumentLines = (args) => {
  const lines = [];
  Object.keys(args).forEach((arg) => {
    let argLine = `--${arg}[${extractDescription(args[arg].description)}]`;
    if (args[arg].allowedTypes.includes('string')) {
      if (args[arg].allowedValues) {
        argLine += `: :(${args[arg].allowedValues.join(' ')})`;
      } else if (['configPath'].includes(arg)) {
        argLine += ': :_files';
      } else if (['projectDirectory', 'initializeProjectTo, currentWorkingDirectory, outFile'].includes(arg)) {
        argLine += ': :_files -/';
      } else if (['stage', 'awsAccount', 'profile', 'scriptName', 'stackName', 'resourceName'].includes(arg)) {
        argLine += ': :_history_complete_word';
      } else {
        argLine += ': :()';
      }
    }
    lines.push(`'${argLine}'`);
    if (args[arg].alias) {
      lines.push(`'${argLine.replace(`--${arg}`, `--${args[arg].alias}`)}'`);
    }
  });
  return lines.join(' \\\n\t\t\t\t\t\t');
};
