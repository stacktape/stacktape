import type { ExpectedError, UnexpectedError } from '@utils/errors';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { cliArgsAliases } from '@cli-config';
import { INVOKED_FROM_ENV_VAR_NAME, IS_DEV, linksMap } from '@config';
import { getRelativePath, transformToUnixPath } from '@shared/utils/fs-utils';
import { splitStringIntoLines, whitespacePrefixMultilineText } from '@shared/utils/misc';
import { getCommandForCurrentEnvironment } from '@utils/cli';
import { memoizeGetters } from '@utils/decorators';
import { getPrettyTime } from '@utils/formatting';
import { logCollectorStream } from '@utils/log-collector';
import { deploymentTui } from '@utils/tui/deployment-tui';
import kleur from 'kleur';
import stripAnsi from 'strip-ansi';
import { getBorderCharacters, table } from 'table';
import terminalLink from 'terminal-link';
import { Spinnies } from './spinnies';

const { blue, cyan, gray, green, red, yellow, magenta } = kleur;

type PrettyPrintFunction = (message: string, options?: Partial<PrintOptions>) => any;

type PrintOptions = {
  requiredLogLevel?: 'debug' | 'info';
  printTo?: 'stdout' | 'stderr';
  identifier?: string;
  printType: string;
  prefixColor: SupportedConsoleColor;
  printIdentifier?: boolean;
  disableWhitespacePrefixing?: boolean;
  disableTerminalPrint?: boolean;
};

@memoizeGetters
export class Printer {
  eventStatuses: { [identifier: string]: 'pending' | 'finished' } = {};
  isProgressPrintingDisabled = false;
  spinner = new Spinnies({
    succeedPrefix: `[${green('SUCCESS')}]`,
    colorizeFail: (text) => this.colorize('red', text),
    colorizeProgress: (text) => this.colorize('cyan', text)
  });

  get canPrintHint() {
    return globalStateManager.logLevel !== 'error';
  }

  disableProgressPrinting = () => {
    this.isProgressPrintingDisabled = true;
  };

  progress = ({
    message,
    identifier,
    type
  }: {
    message: string;
    type: 'START' | 'FINISH' | 'UPDATE';
    identifier: string;
  }) => {
    const setEventStatus = () => {
      if (type === 'START') {
        this.eventStatuses[identifier] = 'pending';
      } else if (type === 'FINISH') {
        this.eventStatuses[identifier] = 'finished';
      }
    };
    if (this.isProgressPrintingDisabled) {
      setEventStatus();
      return;
    }
    const printType = { START: 'START', UPDATE: 'INFO', FINISH: 'SUCCESS' }[type];
    const prefixColor = ({ START: 'magenta', UPDATE: 'cyan', FINISH: 'green' } as const)[type];
    if (globalStateManager.logLevel !== 'info' || globalStateManager.logFormat !== 'fancy') {
      this.print(message, { identifier, requiredLogLevel: 'info', printType, prefixColor, printIdentifier: false });
      setEventStatus();
    } else {
      if (type === 'START') {
        this.spinner.add(identifier, { text: message });
      } else if (type === 'UPDATE') {
        this.spinner.update(identifier, { text: message });
      } else if (type === 'FINISH') {
        this.spinner.succeed(identifier, { text: message });
      }
      // this print will not go into terminal because we set disableTerminalPrint
      // however, it will be put into logCollectorStream
      this.print(message, {
        identifier,
        requiredLogLevel: 'info',
        printType,
        prefixColor,
        printIdentifier: false,
        disableTerminalPrint: true
      });
      setEventStatus();
    }
  };

  getEventStatus = (identifier: string) => {
    return this.eventStatuses[identifier] || null;
  };

  removeAllFinishedEvents = () => {
    this.eventStatuses = {};
  };

  printStacktapeLog = (stacktapeLog: Omit<StacktapeLog, 'commandInvocationId' | 'timestamp'>) => {
    const message = { ...stacktapeLog, timestamp: Date.now() };
    if (process.env[INVOKED_FROM_ENV_VAR_NAME] === 'sdk') {
      process.send(message);
    } else if (stacktapeLog.type === 'ERROR') {
      console.error(message);
    } else {
      console.info(message);
    }
    logCollectorStream.write(message);
  };

  print = (
    message: string,
    {
      requiredLogLevel,
      identifier,
      printType,
      prefixColor,
      printIdentifier,
      printTo = 'stdout',
      disableWhitespacePrefixing,
      // disables printing into terminal
      // message is only written to logCollectorStream
      disableTerminalPrint = false
    }: PrintOptions
  ) => {
    if (globalStateManager.logFormat === 'json') {
      this.printStacktapeLog({ data: { message, identifier, printType }, type: 'MESSAGE' });
      return;
    }
    if (
      (requiredLogLevel === 'debug' && globalStateManager.logLevel !== 'debug') ||
      (requiredLogLevel === 'info' && !['info', 'debug'].includes(globalStateManager.logLevel))
    ) {
      return;
    }

    const prefixPart = `[${
      globalStateManager.logFormat === 'fancy' || globalStateManager.logFormat === 'normal'
        ? this.colorize(prefixColor, printType)
        : printType
    }] `;
    const identifierPart = identifier && printIdentifier ? `${identifier} | ` : '';
    const printContent = `${prefixPart}${identifierPart}${whitespacePrefixMultilineText(
      message,
      disableWhitespacePrefixing ? 0 : stripAnsi(prefixPart).length,
      true
    )}`;
    if (!disableTerminalPrint && !deploymentTui.isActive) {
      if (printTo === 'stdout') {
        console.info(printContent);
      } else {
        console.error(printContent);
      }
    }
    logCollectorStream.write(printContent);
  };

  stopAllSpinners = () => {
    this.spinner.stopAllSpinners();
  };

  announcement = (message: string, highlight?: boolean) => {
    this.print(highlight ? `★  ${this.makeBold(message)}` : message, {
      printType: 'ANNOUNCEMENT',
      prefixColor: 'magenta',
      requiredLogLevel: 'info'
    });
  };

  start: PrettyPrintFunction = (message, opts) => {
    this.print(message, { ...opts, printType: 'START', prefixColor: 'magenta', requiredLogLevel: 'info' });
  };

  info: PrettyPrintFunction = (message, opts) => {
    this.print(message, {
      ...opts,
      printType: 'INFO',
      prefixColor: 'cyan',
      requiredLogLevel: 'info'
    });
  };

  hint: PrettyPrintFunction = (message, opts) => {
    if (globalStateManager.logFormat !== 'json') {
      this.print(message, {
        ...opts,
        printType: 'HINT',
        prefixColor: 'blue',
        requiredLogLevel: 'info'
      });
    }
  };

  debug: PrettyPrintFunction = (message, opts) => {
    this.print(message, { ...opts, printType: 'DEBUG', prefixColor: 'gray', requiredLogLevel: 'debug' });
  };

  warn: PrettyPrintFunction = (message, opts) => {
    this.print(message, { ...opts, printType: 'WARN', prefixColor: 'yellow', requiredLogLevel: 'info' });
  };

  success: PrettyPrintFunction = (message, opts) => {
    this.print(message, { ...opts, printType: 'SUCCESS', prefixColor: 'green', requiredLogLevel: 'info' });
  };

  getLink = (link: keyof typeof linksMap, placeholder: string) => {
    return this.colorize(
      'cyan',
      `${terminalLink(placeholder, linksMap[link].endsWith('/') ? `${linksMap[link]} ` : `${linksMap[link]}/ `)}`
    );
  };

  terminalLink = (url: string, placeholder: string) => {
    return this.colorize('blue', `${terminalLink(placeholder, `${url}`)}`);
  };

  error = (error: UnexpectedError | ExpectedError) => {
    const { hint } = error as ExpectedError;
    const { prettyStackTrace, errorType, sentryEventId } = error.details;

    const errorMessage =
      !IS_DEV && !error.isExpected
        ? `An unexpected error occurred. Last captured event: ${eventManager.lastEvent?.eventType || '-'}.`
        : error.isExpected
          ? `${this.colorize('red', errorType.replace('_ERROR', ''))}: ${error.message}`
          : error.message;

    if (globalStateManager.logFormat === 'json') {
      this.printStacktapeLog({
        type: 'ERROR',
        data: { errorType, message: errorMessage, reportedErrorId: sentryEventId, stack: prettyStackTrace }
      });
    } else {
      this.print(`${errorMessage}${prettyStackTrace ? `\n${prettyStackTrace}` : ''}`, {
        prefixColor: 'red',
        printType: errorType === 'UNEXPECTED_ERROR' ? 'UNEXPECTED_ERROR' : 'ERROR',
        printTo: 'stderr'
      });
    }
    if (sentryEventId) {
      this.hint(
        `This error has been anonymously reported to our error monitoring service with id ${sentryEventId}.
You can create an issue with more details at ${printer.getLink(
          'newIssue',
          'New issue'
        )}. Please include error id in your issue.`
      );
    }

    const logHintAfterError = (hintMsg: string) => this.hint(hintMsg);
    if (hint && this.canPrintHint) {
      if (Array.isArray(hint)) {
        hint.forEach(logHintAfterError);
      } else {
        logHintAfterError(hint);
      }
    }
    this.hint(`To get help, you can join our ${printer.makeBold('Discord')} community: https://discord.gg/gSvzRWe3YD`);
  };

  getTime = (durationInMs: number) => {
    return this.colorize('yellow', getPrettyTime(durationInMs));
  };

  prettyCommand = (command: StacktapeCommand) => {
    const adjustedCommand = getCommandForCurrentEnvironment(command, globalStateManager.invokedFrom);
    if (globalStateManager.invokedFrom === 'sdk') {
      return `${this.colorize('yellow', `${adjustedCommand}()`)}`;
    }
    return `${this.colorize('yellow', `stacktape ${adjustedCommand}`)}`;
  };

  prettyOption = (option: StacktapeCliArg) => {
    if (globalStateManager.invokedFrom === 'sdk') {
      return `${this.makeBold(this.colorize('gray', option))}`;
    }
    const alias = cliArgsAliases[option];
    return `${this.makeBold(this.colorize('gray', `--${option} (--${alias})`))}`;
  };

  prettyResourceName = (resourceName: string) => {
    return this.makeBold(resourceName);
  };

  prettyStackName = (stackName: string) => {
    return this.makeBold(stackName);
  };

  prettyResourceParamName = (resourceParam: string) => {
    return this.makeBold(this.colorize('gray', resourceParam));
  };

  prettyConfigProperty = (property: string) => {
    return this.makeBold(this.colorize('gray', property));
  };

  prettyResourceType = (property: StacktapeResourceDefinition['type']) => {
    return this.makeBold(this.colorize('blue', property));
  };

  prettyFilePath = (filePath: string) => {
    const res = kleur.underline(transformToUnixPath(getRelativePath(filePath)));
    return res.startsWith('./') ? res : `./${res}`;
  };

  colorize = (color: SupportedConsoleColor, text: string, makeBold?: boolean): string => {
    if (globalStateManager.logFormat === 'json') {
      return text;
    }
    if (globalStateManager.logFormat === 'fancy' || globalStateManager.logFormat === 'normal') {
      const colorizeFn = {
        cyan,
        blue,
        gray,
        yellow,
        green,
        red,
        magenta
      }[color];
      const colorized = colorizeFn(text);
      return makeBold ? this.makeBold(colorized) : colorized;
    }
    return text;
  };

  makeBold = (text): string => {
    if (globalStateManager.logFormat === 'fancy' || globalStateManager.logFormat === 'normal') {
      return kleur.bold(text);
    }
    return text;
  };

  printListStack = (listStacksResult: StackListReturnValue) => {
    const header = [
      'Stack name',
      // 'Service name',
      'Stage',
      'Status',
      'Last updated',
      'Created',
      'Monthly spend',
      // 'Status reason',
      'Deployed by Stacktape'
      // 'Console link'
    ];
    const unspecifiedValue = this.colorize('gray', 'N/A');
    const content = [
      ...listStacksResult
        .filter(({ isStacktapeStack }) => isStacktapeStack)
        .sort(({ stackName: name1 }, { stackName: name2 }) => name1.localeCompare(name2)),
      ...listStacksResult
        .filter(({ isStacktapeStack }) => !isStacktapeStack)
        .sort(({ stackName: name1 }, { stackName: name2 }) => name1.localeCompare(name2))
    ].map((stackInfo) => {
      return [
        stackInfo.stackName,
        // stackInfo.serviceName ? this.colorize('magenta', stackInfo.serviceName) : unspecifiedValue,
        stackInfo.stage ? this.colorize('cyan', stackInfo.stage) : unspecifiedValue,
        stackInfo.stackStatus,
        stackInfo.lastUpdateTime
          ? this.colorize('blue', new Date(stackInfo.lastUpdateTime).toLocaleString())
          : unspecifiedValue,
        stackInfo.creationTime
          ? this.colorize('blue', new Date(stackInfo.creationTime).toLocaleString())
          : unspecifiedValue,
        stackInfo.actualSpend ? printer.colorize('cyan', stackInfo.actualSpend) : unspecifiedValue,
        stackInfo.isStacktapeStack ? this.colorize('green', 'TRUE') : 'FALSE'
      ];
    });
    this.printTable({ header, rows: content });
  };

  printTable = ({ header, rows }: { header: string[]; rows: any[][] }) => {
    console.info(table([header.map(this.makeBold), ...rows], { border: getBorderCharacters('honeywell') }));
  };

  formatComplexStackErrors = (processedErrors: { errorMessage: string; hints?: string[] }[], whitespacePadding = 0) => {
    const outputLines: string[] = [];
    processedErrors.forEach(({ errorMessage, hints }, index) => {
      const errorMessageLines = splitStringIntoLines(errorMessage, 160, 40);
      outputLines.push(
        `${' '.repeat(whitespacePadding)}${this.colorize('red', `Error ${index + 1}: `)}${errorMessageLines.shift()}`
      );
      errorMessageLines.forEach((line) => {
        outputLines.push(`${' '.repeat(whitespacePadding)}   ${line.trim()}`);
      });
      (hints || []).forEach((hintString) => {
        outputLines.push(`${' '.repeat(whitespacePadding + 2)}[${this.colorize('blue', 'HINT')}]: ${hintString}`);
      });
    });
    return outputLines.join('\n');
  };

  cleanUpAfterExitSignal = () => {
    return this.spinner.cleanUpAfterExitSignal();
  };
}

export const printer = new Printer();
