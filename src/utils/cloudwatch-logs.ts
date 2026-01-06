import type { FilteredLogEvent, LogStream } from '@aws-sdk/client-cloudwatch-logs';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV } from '@config';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { getErrorFromString } from '@utils/errors';
import { getAwsSynchronizedTime } from '@utils/time';
import dayjs from 'dayjs';
import { logCollectorStream } from './log-collector';

export class LambdaCloudwatchLogPrinter {
  logGroupName: string;
  logStream: LogStream;
  fetchSince: number;
  handledEvents: string[] = [];
  #printedRequestIds: { [requestId: string]: SupportedConsoleColor } = {};
  #colorSequence: SupportedConsoleColor[] = ['blue', 'yellow', 'magenta', 'green', 'gray'];
  #lastColor: SupportedConsoleColor;

  constructor({ fetchSince, logGroupAwsResourceName }: { fetchSince: number; logGroupAwsResourceName: string }) {
    this.fetchSince = fetchSince;
    this.logGroupName = logGroupAwsResourceName;
  }

  printLogs = async () => {
    if (!this.logStream) {
      const logStreams = await awsSdkManager.getLogStreams({ logGroupName: this.logGroupName });
      this.logStream = logStreams.find((ls) => ls.creationTime > this.fetchSince);
    }
    if (this.logStream) {
      const events = await awsSdkManager.getLogEvents({
        logGroupName: this.logGroupName,
        logStreamNames: [this.logStream.logStreamName],
        startTime: this.fetchSince + 1
      });
      if (events.length) {
        this.fetchSince = events[events.length - 1].timestamp;
        const unhandledEvents = events.filter((e) => !this.handledEvents.includes(e.eventId));
        this.#printLambdaLogEvents(unhandledEvents);
        this.handledEvents.push(...events.map((e) => e.eventId));
      }
    }
  };

  startUsingNewLogStream = async () => {
    this.logStream = null;
    this.fetchSince = (await getAwsSynchronizedTime()).getTime() + 1;
  };

  #printError = (event: FilteredLogEvent) => {
    try {
      const matchedParts = event.message.trim().match(/([\s\S]*)\t([\s\S]*)\t([\s\S]*)\t([\s\S]*)\t([\s\S]*)/);
      const [, , requestId, , errorType, logContent] = matchedParts;
      const logTypePart = tuiManager.colorize('red', tuiManager.makeBold(`ERROR: ${errorType}`));
      let errorString: string;
      try {
        const { errorMessage, stack } = JSON.parse(logContent);
        errorString = `${errorMessage}${stack.slice(1).join('\n')}`;
      } catch {
        errorString = logContent;
      }
      const logContentPart = errorType === 'Invoke Error ' ? getErrorFromString(errorString).trim() : logContent;
      console.error(
        `${this.#getPrefix(requestId)} ${this.#getFormattedTimeStamp(
          event
        )} ${logTypePart} ${this.#getFormattedRequestId(requestId)}\n${logContentPart}\n`
      );
    } catch {
      const matchedParts = event.message.trim().match(/([\s\S]*)\t([\s\S]*)\t([\s\S]*)\t([\s\S]*)/);
      const [, , requestId, logType, logContent] = matchedParts;
      const logTypePart = tuiManager.colorize('red', tuiManager.makeBold(logType));
      console.error(
        `${this.#getPrefix(requestId)} ${this.#getFormattedTimeStamp(
          event
        )} ${logTypePart} ${this.#getFormattedRequestId(requestId)}\n${logContent.trim()}\n`
      );
    }
  };

  #getFormattedTimeStamp = (event: FilteredLogEvent) => {
    return `${tuiManager.colorize('yellow', new Date(event.timestamp).toLocaleString())}`;
  };

  #getFormattedRequestId = (requestId: string) => {
    return tuiManager.colorize('gray', `(request ID: ${requestId.trim()})`);
  };

  #getFormattedReportData = ({ duration, memoryUsed, initDuration }) => {
    return `duration: ${tuiManager.colorize('cyan', duration.trim())}, memory used: ${tuiManager.colorize(
      'cyan',
      memoryUsed.trim()
    )}${initDuration ? `, cold start duration: ${tuiManager.colorize('cyan', initDuration.trim())}` : ''}.`;
  };

  #getPrefix = (requestId?: string) => {
    if (!requestId) {
      return tuiManager.makeBold('?');
    }
    const trimmedRequestId = requestId.trim();
    let color = this.#printedRequestIds[trimmedRequestId];
    if (!color) {
      let nextColorIndex = this.#colorSequence.indexOf(this.#lastColor) + 1;
      if (nextColorIndex === this.#colorSequence.length) {
        nextColorIndex = 0;
      }
      color = this.#colorSequence[nextColorIndex];
      this.#lastColor = color;
      this.#printedRequestIds[trimmedRequestId] = color;
    }
    return tuiManager.makeBold(tuiManager.colorize(color, '>'));
  };

  #printLambdaLogEvents = (events: FilteredLogEvent[]) => {
    const endLogs: { [requestId: string]: (reportData: string) => any } = {};

    events.forEach((event) => {
      try {
        const message = event.message.trim();
        if (message.startsWith('INIT_START')) {
          return;
        }
        if (message.startsWith('START')) {
          const [, requestId] = message.match(/START RequestId:(.*)Version: \$LATEST/);
          console.info(
            `${this.#getPrefix(requestId)} ${this.#getFormattedTimeStamp(event)} ${tuiManager.makeBold(
              'START'
            )} ${this.#getFormattedRequestId(requestId)}\n`
          );
        } else if (message.startsWith('END')) {
          const [, requestId] = message.match(/END RequestId:(.*)/);
          endLogs[requestId.trim()] = (reportData) =>
            console.info(
              `${this.#getPrefix(requestId)} ${this.#getFormattedTimeStamp(event)} ${tuiManager.makeBold(
                'END'
              )} ${this.#getFormattedRequestId(requestId)} ${reportData}\n`
            );
        } else if (message.startsWith('REPORT')) {
          const match = message.match(
            /REPORT RequestId:(.*)Duration:(.*)Billed Duration:(.*)Memory Size:(.*)Max Memory Used:(.*)/
          );
          const coldStartMatch = message.match(
            /REPORT RequestId:(.*)Duration:(.*)Billed Duration:(.*)Memory Size:(.*)Max Memory Used:(.*)Init Duration:(.*)/
          );
          const [, requestId, duration, , , memoryUsed, initDuration] = coldStartMatch || match;
          const reportData = this.#getFormattedReportData({
            duration,
            memoryUsed,
            initDuration
          });
          endLogs[requestId.trim()](reportData);
        } else if (typeof message === 'string') {
          // usually well formatted logs like this example below:
          // 2024-03-28T11:28:41.767Z 93abe1de-4ca9-4641-aad1-a857a42bbfe3 INFO something something
          // in that case following block is executed
          if (message.match(/([\s\S]*)\t([\s\S]*)\t([\s\S]*)\t([\s\S]*)/)) {
            const [, , requestId, logType, logContent] = message.match(/([\s\S]*)\t([\s\S]*)\t([\s\S]*)\t([\s\S]*)/);
            const logTypePart = tuiManager.colorize('cyan', tuiManager.makeBold(logType));
            if (logType === 'ERROR' || logType === 'Invoke Error ') {
              return this.#printError(event);
            }
            console.info(
              `${this.#getPrefix(requestId)} ${this.#getFormattedTimeStamp(
                event
              )} ${logTypePart} ${this.#getFormattedRequestId(requestId)}\n${logContent}\n`
            );
          } // sometimes messages are just plain strings without the timestamp + request id + log level info
          else {
            console.info(
              `${this.#getPrefix()} ${this.#getFormattedTimeStamp(
                event
              )} ${this.#getFormattedRequestId('UNKNOWN')}\n${message}\n`
            );
          }
        } else if (IS_DEV) {
          console.error('Unexpected log event data: ', event);
        }
      } catch (err) {
        if (IS_DEV) {
          console.error('Error pretty-printing lambda log: ', err);
        }
        console.info(`${event.message.trim()}\n`);
      }
    });
  };
}

export class CodebuildDeploymentCloudwatchLogPrinter {
  logGroupName: string;
  logStreamName: string;
  fetchSince: number;
  buildPhaseStartedLogFound = false;
  handledEvents = new Set<string>();

  constructor({
    fetchSince,
    logGroupName,
    logStreamName
  }: {
    fetchSince: number;
    logGroupName: string;
    logStreamName: string;
  }) {
    this.fetchSince = fetchSince;
    this.logGroupName = logGroupName;
    this.logStreamName = logStreamName;
  }

  printLogs = async () => {
    const events = await awsSdkManager.getLogEvents({
      logGroupName: this.logGroupName,
      logStreamNames: [this.logStreamName],
      startTime: this.fetchSince
    });
    if (events.length) {
      this.fetchSince = events[events.length - 1].timestamp;
      const unprocessedEvents = events.filter((e) => !this.handledEvents.has(e.eventId));
      if (this.buildPhaseStartedLogFound) {
        this.#printCodebuildDeploymentLogEvents(unprocessedEvents);
      } else {
        const buildPhaseStartedLogIndex = unprocessedEvents.findIndex(({ message }) =>
          message.includes('Entering phase BUILD')
        );
        if (buildPhaseStartedLogIndex !== -1) {
          this.buildPhaseStartedLogFound = true;
          this.#printCodebuildDeploymentLogEvents(unprocessedEvents.slice(buildPhaseStartedLogIndex + 1));
        }
      }
      events.forEach((e) => this.handledEvents.add(e.eventId));
    }
  };

  #printCodebuildDeploymentLogEvents = (events: FilteredLogEvent[]) => {
    events
      // filter out meta messages from codebuild
      .filter(({ message }) =>
        ['Phase complete:', 'Phase context status', 'Entering phase'].every((fragment) => !message.includes(fragment))
      )
      .forEach((event) => {
        let message = event.message.trim();
        if (message.startsWith('[Container]')) {
          message = tuiManager.colorize('gray', message);
        }
        console.info(
          `${tuiManager.colorize('gray', `[${dayjs(event.timestamp).format('HH:mm:ss:SSS')}]:`)} ${this.#colorizeMessage(
            // if we have empty message we will print white spaces (otherwise parts of messages from spinner might be printed)
            message.length === 0 ? ' '.repeat(30) : message
          )}`
        );
      });
  };

  #colorizeMessage = (message: string) =>
    message
      .replaceAll('WARN', tuiManager.colorize('yellow', 'WARN'))
      .replaceAll('UNEXPECTED_ERROR', tuiManager.colorize('red', 'UNEXPECTED_ERROR'))
      .replaceAll('ERROR', tuiManager.colorize('red', 'ERROR'))
      .replaceAll('INFO', tuiManager.colorize('cyan', 'INFO'))
      .replaceAll('HINT', tuiManager.colorize('blue', 'HINT'))
      .replaceAll('SUCCESS', tuiManager.colorize('green', 'SUCCESS'))
      .replaceAll('START', tuiManager.colorize('magenta', 'START'));
}

export class SsmExecuteScriptCloudwatchLogPrinter {
  logGroupName: string;
  commandId: string;
  instanceId: string;
  logStreamPrefix: string;
  fetchSince: number;
  handledEvents = new Set<string>();

  constructor({
    fetchSince,
    logGroupName,
    commandId,
    instanceId
  }: {
    fetchSince: number;
    logGroupName: string;
    commandId: string;
    instanceId: string;
  }) {
    this.fetchSince = fetchSince;
    this.logGroupName = logGroupName;
    this.commandId = commandId;
    this.instanceId = instanceId;
    this.logStreamPrefix = `${commandId}/${instanceId}/aws-runShellScript`;
    // this.logStreams = { stdout: `${logStreamPrefix}/stdout`, stderr: `${logStreamPrefix}/stderr` };
  }

  printLogs = async () => {
    const events = await awsSdkManager.getLogEvents({
      logGroupName: this.logGroupName,
      logStreamPrefix: this.logStreamPrefix,
      startTime: this.fetchSince
    });
    if (events.length) {
      this.fetchSince = events[events.length - 1].timestamp;
      const unprocessedEvents = events.filter((e) => !this.handledEvents.has(e.eventId)).sort();

      this.#printSsmExecuteScriptLogEvents(unprocessedEvents);

      events.forEach((e) => this.handledEvents.add(e.eventId));
    }
  };

  #printSsmExecuteScriptLogEvents = (events: FilteredLogEvent[]) => {
    events.forEach((event) => {
      let message = event.message.trim();
      const scriptSubstring = `/var/lib/amazon/ssm/${this.instanceId}/document/orchestration/${this.commandId}/awsrunShellScript/0.awsrunShellScript/_script.sh:`;

      message = message.replaceAll(scriptSubstring, '');

      const messageLines = message
        .split('\n')
        .map((line) =>
          line.startsWith('++')
            ? `  ${tuiManager.colorize('gray', `└ ${line.trim()}`)}`
            : ` ${event.logStreamName?.endsWith('stderr') ? tuiManager.colorize('red', '!└') : ' └'} ${line.trim()}`
        )
        .join('\n');
      console.info(messageLines);
      logCollectorStream.write(messageLines);
    });
  };
}
