import type { SupportedConsoleColor } from '@application-services/tui-manager/types';
import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV } from '@config';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { getErrorFromString } from '@utils/errors';
import { getAwsSynchronizedTime } from '@utils/time';
import { formatIsoLocalTime } from '@utils/formatting';
import { getPlainLambdaLogLineLevel, parseLambdaLogLine, type LambdaLogLevel } from '@utils/lambda-log-lines';

/** `timestamp` is the CloudWatch event time in milliseconds, when the line comes from one event. */
/** How far each fetch reaches back for events that reached CloudWatch after newer ones of another log stream. */
const LATE_EVENT_WINDOW_MS = 10_000;

type LogCallback = (message: string, level: 'info' | 'warn' | 'error', timestamp?: number) => void;

export class LambdaCloudwatchLogPrinter {
  logGroupName: string;
  fetchSince: number;
  /** Events older than this are not shown: they belong to an earlier session or an earlier deployment. */
  #notBefore: number;
  #handledEvents = new Set<string>();
  #printedRequestIds: { [requestId: string]: SupportedConsoleColor } = {};
  #colorSequence: SupportedConsoleColor[] = ['blue', 'yellow', 'magenta', 'green', 'gray'];
  #lastColor: SupportedConsoleColor;
  #onLog: LogCallback | null = null;
  #currentEventTimestamp: number | undefined;

  constructor({
    fetchSince,
    logGroupAwsResourceName,
    onLog
  }: {
    fetchSince: number;
    logGroupAwsResourceName: string;
    onLog?: LogCallback;
  }) {
    this.fetchSince = fetchSince;
    this.#notBefore = fetchSince + 1;
    this.logGroupName = logGroupAwsResourceName;
    this.#onLog = onLog || null;
  }

  #output(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (this.#onLog) {
      this.#onLog(message, level, this.#currentEventTimestamp);
    } else if (level === 'error') {
      console.error(message);
    } else {
      console.info(message);
    }
  }

  /**
   * Fetches the log group's events since the last fetch, from every log stream: concurrent invocations write to
   * several. Events can reach CloudWatch out of order across streams, so each fetch reaches back a little and skips
   * events it has already shown. Returns how many new events it printed. One call is one `FilterLogEvents` request (or
   * one per page).
   */
  printLogs = async (): Promise<number> => {
    const events = await awsSdkManager.observability.getLogEvents({
      logGroupName: this.logGroupName,
      startTime: Math.max(this.#notBefore, this.fetchSince - LATE_EVENT_WINDOW_MS)
    });
    if (!events.length) return 0;
    this.fetchSince = Math.max(this.fetchSince, ...events.map((event) => event.timestamp ?? 0));
    const unhandledEvents = events
      .filter((event) => (event.timestamp ?? 0) >= this.#notBefore && !this.#handledEvents.has(event.eventId))
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0) || (a.ingestionTime ?? 0) - (b.ingestionTime ?? 0));
    this.#printLambdaLogEvents(unhandledEvents);
    this.#currentEventTimestamp = undefined;
    for (const event of unhandledEvents) {
      this.#handledEvents.add(event.eventId);
    }
    // Prevent unbounded memory growth - keep only recent event IDs
    if (this.#handledEvents.size > 10000) {
      const eventsArray = Array.from(this.#handledEvents);
      this.#handledEvents = new Set(eventsArray.slice(-5000));
    }
    return unhandledEvents.length;
  };

  /** Shows only events written from now on, for example after the function was redeployed. */
  skipEarlierEvents = async () => {
    const now = (await getAwsSynchronizedTime()).getTime();
    this.#notBefore = now + 1;
    this.fetchSince = now;
  };

  /** Node's error records carry the error as JSON; the stack is shown with dependency frames greyed out. */
  #formatNodeErrorRecord = (content: string) => {
    let errorString = content;
    try {
      const { errorMessage, stack } = JSON.parse(content);
      errorString = `${errorMessage}${(stack as string[]).slice(1).join('\n')}`;
    } catch {
      return content;
    }
    return getErrorFromString(errorString, {
      message: (message) => tuiManager.makeBold(message),
      dependencyFrame: (frame) => tuiManager.colorize('gray', frame)
    }).trim();
  };

  #getFormattedTimeStamp = (event: FilteredLogEvent) => {
    return `${tuiManager.colorize('yellow', formatIsoLocalTime(new Date(event.timestamp)))}`;
  };

  #getFormattedRequestId = (requestId: string) => {
    return tuiManager.colorize('gray', `(request ID: ${requestId.trim()})`);
  };

  #getFormattedReportData = ({
    duration,
    memoryUsed,
    initDuration
  }: {
    duration?: string;
    memoryUsed?: string;
    initDuration?: string;
  }) => {
    return `duration: ${tuiManager.colorize('cyan', (duration ?? '?').trim())}, memory used: ${tuiManager.colorize(
      'cyan',
      (memoryUsed ?? '?').trim()
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
    const endLogs: { [requestId: string]: (reportData: string, level: LambdaLogLevel) => void } = {};

    events.forEach((event) => {
      this.#currentEventTimestamp = event.timestamp;
      try {
        const line = parseLambdaLogLine(event.message);
        const time = this.#getFormattedTimeStamp(event);
        switch (line.kind) {
          case 'skip':
            return;
          case 'init-report': {
            if (line.level === 'error') {
              this.#output(
                `${this.#getPrefix()} ${time} ${tuiManager.colorize('red', tuiManager.makeBold('INIT FAILED'))} ${line.errorType || line.status}${line.initDuration ? ` after ${line.initDuration}` : ''}`,
                'error'
              );
            } else if (line.initDuration) {
              this.#output(
                `${this.#getPrefix()} ${time} ${tuiManager.colorize('cyan', 'INIT')} cold start: ${tuiManager.colorize('cyan', line.initDuration)}`
              );
            }
            return;
          }
          case 'start':
            this.#output(
              `${this.#getPrefix(line.requestId)} ${time} ${tuiManager.makeBold('START')} ${this.#getFormattedRequestId(line.requestId)}`
            );
            return;
          case 'end':
            // Printed with its REPORT line, which follows it; a REPORT that comes with a later fetch prints on its own.
            endLogs[line.requestId] = (reportData, level) =>
              this.#output(
                `${this.#getPrefix(line.requestId)} ${time} ${tuiManager.makeBold('END')} ${this.#getFormattedRequestId(line.requestId)} ${reportData}`,
                level
              );
            return;
          case 'report': {
            const outcome = line.status
              ? ` ${tuiManager.colorize('red', tuiManager.makeBold(`Status: ${line.status}`))}${line.errorType ? ` (${line.errorType})` : ''}.`
              : '';
            const reportData = `${this.#getFormattedReportData(line)}${outcome}`;
            const printEnd = endLogs[line.requestId];
            if (printEnd) {
              printEnd(reportData, line.level);
              delete endLogs[line.requestId];
            } else {
              this.#output(
                `${this.#getPrefix(line.requestId)} ${time} ${tuiManager.makeBold('END')} ${this.#getFormattedRequestId(line.requestId)} ${reportData}`,
                line.level
              );
            }
            return;
          }
          case 'entry': {
            const { level, requestId, logType, content } = line;
            if (!logType || !requestId) {
              // A plain line (`print`, `System.out`) or a runtime's own error output, without a request ID.
              this.#output(`${this.#getPrefix()} ${time}\n${content}`, level);
              return;
            }
            const color = level === 'error' ? 'red' : level === 'warn' ? 'yellow' : 'cyan';
            // Node's error records keep their name (`ERROR: Invoke Error`); other labels show the level (`[ERROR]`: `ERROR`).
            const label = tuiManager.colorize(
              color,
              tuiManager.makeBold(line.nodeErrorRecord ? `ERROR: ${logType}` : logType.replace(/^\[(.*)\]$/, '$1'))
            );
            const body = line.nodeErrorRecord ? this.#formatNodeErrorRecord(content) : content.trim();
            this.#output(
              `${this.#getPrefix(requestId)} ${time} ${label} ${this.#getFormattedRequestId(requestId)}\n${body}`,
              level
            );
          }
        }
      } catch (err) {
        if (IS_DEV) {
          console.error('Error pretty-printing lambda log: ', err);
        }
        this.#output(event.message.trim(), parseLevelSafely(event.message));
      }
    });
  };
}

const parseLevelSafely = (message: string) => {
  try {
    return getPlainLambdaLogLineLevel(message);
  } catch {
    return 'info' as const;
  }
};

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
    const events = await awsSdkManager.observability.getLogEvents({
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
      if (tuiManager.mode === 'jsonl') {
        tuiManager.printLines([messageLines]);
      } else {
        console.info(messageLines);
        tuiManager.emitCollectorLog({ level: 'info', source: 'ssm-script', message: messageLines });
      }
    });
  };
}
