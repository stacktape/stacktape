import type { SupportedConsoleColor } from '@application-services/tui-manager/types';
import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV } from '@config';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { getErrorFromString } from '@utils/errors';
import { getAwsSynchronizedTime } from '@utils/time';
import { formatIsoLocalTime } from '@utils/formatting';
import { getPlainLambdaLogLineLevel, parseLambdaLogLine, type LambdaLogLevel } from '@utils/lambda-log-lines';

/** How far each fetch reaches back for events that reached CloudWatch after newer ones of another log stream. */
const LATE_EVENT_WINDOW_MS = 10_000;
/**
 * How long shown event IDs are kept after the newest event, so the next dev session of a stage can read the end of
 * this one again and skip what this one showed (`shownEventsSince`).
 */
const SHOWN_EVENT_MEMORY_MS = 60_000;
/** The backlog search narrows a window that holds too many events down to this, and reads a window this short whole. */
const BACKLOG_MIN_WINDOW_MS = 1000;
/** The backlog search starts with the last minute and widens each older window up to tenfold. */
const BACKLOG_FIRST_WINDOW_MS = 60_000;
/** The backlog search gives up after this many requests and says so: a few seconds within the budget. */
const BACKLOG_MAX_REQUESTS = 12;

const byTime = (a: FilteredLogEvent, b: FilteredLogEvent) =>
  (a.timestamp ?? 0) - (b.timestamp ?? 0) || (a.ingestionTime ?? 0) - (b.ingestionTime ?? 0);

/** `timestamp` is the CloudWatch event time in milliseconds, when the line comes from one event. */
type LogCallback = (message: string, level: 'info' | 'warn' | 'error', timestamp?: number) => void;

type FetchPage = (params: {
  logGroupName: string;
  startTime: number;
  endTime?: number;
  limit?: number;
  nextToken?: string;
  filterPattern?: string;
}) => Promise<{ events: FilteredLogEvent[]; nextToken?: string }>;

/**
 * The search for the newest `lines` events between `since` and `until`. It reads one request at a time, from the last
 * minute backwards in wider and wider windows. `FilterLogEvents` returns the oldest events of a range first, and with a
 * filter it can return empty pages while it scans; reading the newest window first keeps the recent lines from waiting
 * behind the whole range. A window that holds more events than are needed is narrowed to its newest part.
 */
type BacklogSearch = {
  until: number;
  lines: number;
  /** The range not read yet: from `lowest` to `cursor`, both inclusive. */
  lowest: number;
  cursor: number;
  span: number;
  /** Every event newer than `cursor`, oldest first. */
  found: FilteredLogEvent[];
  /** Every event of a range right below `lowest`, from a window that held too many: older than all unread ones. */
  below: FilteredLogEvent[];
  /** The window being read page by page. */
  partial?: { events: FilteredLogEvent[]; nextToken: string };
  requests: number;
};

export class LambdaCloudwatchLogPrinter {
  logGroupName: string;
  fetchSince: number;
  /** Events older than this are not shown: they belong to an earlier session or an earlier deployment. */
  #notBefore: number;
  /** Shown events by ID, with their time: only events within the late-event window can be fetched again. */
  #handledEvents = new Map<string, number>();
  /** Shown events by ID, with their time, for `SHOWN_EVENT_MEMORY_MS`. */
  #recentlyShown = new Map<string, number>();
  /** A read whose next page is still to come; the next poll fetches it. */
  #query: { startTime: number; nextToken: string } | undefined;
  #backlog: BacklogSearch | undefined;
  #fetchPage: FetchPage;
  #filterPattern: string | undefined;
  #printedRequestIds: { [requestId: string]: SupportedConsoleColor } = {};
  /**
   * The request each log stream is handling. An execution environment handles one request at a time, so a line without
   * a request ID between its START and END (a `print`, Python's uncaught-exception record) belongs to that request.
   */
  #activeRequestIds: { [logStreamName: string]: string } = {};
  #colorSequence: SupportedConsoleColor[] = ['blue', 'yellow', 'magenta', 'green', 'gray'];
  #lastColor: SupportedConsoleColor;
  #onLog: LogCallback | null = null;
  #onEvents: ((events: FilteredLogEvent[]) => void) | null = null;
  #currentEventTimestamp: number | undefined;

  constructor({
    fetchSince,
    logGroupAwsResourceName,
    onLog,
    onEvents,
    backlog,
    filterPattern,
    alreadyShown = [],
    fetchPage = (params) => awsSdkManager.observability.filterLogEventsPage(params)
  }: {
    fetchSince: number;
    logGroupAwsResourceName: string;
    onLog?: LogCallback;
    /** Receives the events as CloudWatch returned them, oldest first, instead of formatted lines. */
    onEvents?: (events: FilteredLogEvent[]) => void;
    /** Shows the newest `lines` events between `fetchSince` and `until` first, then follows from `until`. */
    backlog?: { lines: number; until: number };
    /** A CloudWatch Logs filter pattern: only matching events are read. */
    filterPattern?: string;
    /** Events, by ID and time, that an earlier reader of the log group already showed: they are skipped. */
    alreadyShown?: Array<[eventId: string, timestamp: number]>;
    fetchPage?: FetchPage;
  }) {
    this.fetchSince = fetchSince;
    this.#notBefore = fetchSince + 1;
    for (const [eventId, timestamp] of alreadyShown) {
      if (timestamp >= this.#notBefore) this.#handledEvents.set(eventId, timestamp);
    }
    this.logGroupName = logGroupAwsResourceName;
    this.#onLog = onLog || null;
    this.#onEvents = onEvents || null;
    this.#fetchPage = fetchPage;
    this.#filterPattern = filterPattern;
    if (backlog && backlog.lines > 0 && backlog.until > fetchSince) {
      this.#backlog = {
        until: backlog.until,
        lines: backlog.lines,
        lowest: fetchSince + 1,
        cursor: backlog.until,
        span: Math.min(backlog.until - fetchSince, BACKLOG_FIRST_WINDOW_MS),
        found: [],
        below: [],
        requests: 0
      };
    }
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
   * events it has already shown. One call is one `FilterLogEvents` request; `more` says that the next page is waiting.
   */
  printLogs = async (): Promise<{ found: number; more: boolean }> => {
    if (this.#backlog) return this.#readBacklog(this.#backlog);
    const query = this.#query ?? {
      startTime: Math.max(this.#notBefore, this.fetchSince - LATE_EVENT_WINDOW_MS),
      nextToken: undefined
    };
    const { events, nextToken } = await this.#fetchPage({
      logGroupName: this.logGroupName,
      startTime: query.startTime,
      nextToken: query.nextToken,
      filterPattern: this.#filterPattern
    });
    this.#query = nextToken ? { startTime: query.startTime, nextToken } : undefined;
    return { found: this.#printNewEvents(events), more: Boolean(nextToken) };
  };

  #printNewEvents = (events: FilteredLogEvent[]) => {
    if (events.length) this.fetchSince = Math.max(this.fetchSince, ...events.map((event) => event.timestamp ?? 0));
    const unhandledEvents = events
      .filter((event) => (event.timestamp ?? 0) >= this.#notBefore && !this.#handledEvents.has(event.eventId))
      .sort(byTime);
    this.#printLambdaLogEvents(unhandledEvents);
    this.#currentEventTimestamp = undefined;
    for (const event of unhandledEvents) {
      this.#handledEvents.set(event.eventId, event.timestamp ?? 0);
      this.#recentlyShown.set(event.eventId, event.timestamp ?? 0);
    }
    for (const [eventId, timestamp] of this.#recentlyShown) {
      if (timestamp < this.fetchSince - SHOWN_EVENT_MEMORY_MS) this.#recentlyShown.delete(eventId);
    }
    // No later read returns an event older than where it starts, so its ID is no longer needed.
    const oldestReadable = Math.min(
      this.#query?.startTime ?? Infinity,
      Math.max(this.#notBefore, this.fetchSince - LATE_EVENT_WINDOW_MS)
    );
    for (const [eventId, timestamp] of this.#handledEvents) {
      if (timestamp < oldestReadable) this.#handledEvents.delete(eventId);
    }
    return unhandledEvents.length;
  };

  /** The events this reader showed at or after `time`, by ID and time; kept for `SHOWN_EVENT_MEMORY_MS`. */
  shownEventsSince = (time: number): Array<[eventId: string, timestamp: number]> =>
    [...this.#recentlyShown].filter(([, timestamp]) => timestamp >= time);

  #readBacklog = async (search: BacklogSearch): Promise<{ found: number; more: boolean }> => {
    const need = search.lines - search.found.length;
    const startTime = Math.max(search.lowest, search.cursor - search.span + 1);
    // A window of a second is read whole, at the most events `FilterLogEvents` returns at once, and its newest events
    // kept: a narrower one would cost a request for every few events.
    const whole = search.cursor - startTime + 1 <= BACKLOG_MIN_WINDOW_MS;
    const page = await this.#fetchPage({
      logGroupName: this.logGroupName,
      startTime,
      endTime: search.cursor,
      limit: whole ? 10_000 : Math.min(need, 10_000),
      nextToken: search.partial?.nextToken,
      filterPattern: this.#filterPattern
    });
    search.requests++;
    const events = [...(search.partial?.events ?? []), ...page.events];
    search.partial = undefined;
    const lastRequest = search.requests >= BACKLOG_MAX_REQUESTS;
    if (page.nextToken && lastRequest) {
      // Out of requests in the middle of a window. Only the windows read to their end are shown.
      return this.#finishBacklog(search, search.found, { incomplete: true });
    }
    // CloudWatch also returns a token after the last page of a range; the next page is then empty.
    if (page.nextToken && (whole || events.length < need)) {
      search.partial = { events, nextToken: page.nextToken };
      return { found: 0, more: true };
    }
    if (page.nextToken) {
      // More events than are needed. The page holds every event of the window older than its newest one, so the
      // search goes on above that event, in a narrower window.
      const newest = Math.max(...events.map((event) => event.timestamp ?? 0));
      search.below = events.filter((event) => (event.timestamp ?? 0) < newest);
      search.lowest = newest;
      search.span = Math.max(BACKLOG_MIN_WINDOW_MS, Math.floor((search.cursor - search.lowest + 1) / 10));
      return { found: 0, more: true };
    }
    search.found = [...events, ...search.found];
    search.cursor = startTime - 1;
    if (search.found.length >= search.lines) return this.#finishBacklog(search, search.found);
    if (startTime <= search.lowest) return this.#finishBacklog(search, [...search.below, ...search.found]);
    if (lastRequest) return this.#finishBacklog(search, search.found, { incomplete: true });
    search.span = Math.min(search.cursor - search.lowest + 1, search.span * 10);
    return { found: 0, more: true };
  };

  /**
   * Prints the backlog. Following then shows no event older than the backlog's oldest fully read window, nor older than
   * the oldest event it showed: a window can hold more events than were shown. The events read but cut by the line
   * limit count as handled, so following does not show one that has the time of the oldest line shown.
   */
  #finishBacklog = (search: BacklogSearch, events: FilteredLogEvent[], { incomplete = false } = {}) => {
    this.#backlog = undefined;
    const shown = [...events].sort(byTime).slice(-search.lines);
    this.#notBefore = Math.max(search.cursor + 1, shown[0]?.timestamp ?? 0);
    this.fetchSince = search.until;
    if (incomplete) {
      const reason = `CloudWatch needed more than ${BACKLOG_MAX_REQUESTS} requests to search further back${this.#filterPattern ? ' with this filter' : ''}`;
      this.#output(
        search.cursor >= search.until
          ? `Earlier log lines were not read: ${reason}. New lines are shown as they arrive; to search the whole window, use --query.`
          : `Only the log lines since ${formatIsoLocalTime(new Date(search.cursor + 1))} are shown: ${reason}. To search the whole window, use --query.`,
        'warn'
      );
    }
    this.#printLambdaLogEvents(shown);
    this.#currentEventTimestamp = undefined;
    for (const event of events) {
      if ((event.timestamp ?? 0) >= this.#notBefore) this.#handledEvents.set(event.eventId, event.timestamp ?? 0);
    }
    return { found: shown.length, more: false };
  };

  /** Shows only events written from now on, for example after the function was redeployed. */
  skipEarlierEvents = async () => {
    const now = (await getAwsSynchronizedTime()).getTime();
    this.#backlog = undefined;
    this.#query = undefined;
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
      return tuiManager.makeBold('>');
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
    if (this.#onEvents) {
      if (events.length) this.#onEvents(events);
      return;
    }
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
            if (event.logStreamName) this.#activeRequestIds[event.logStreamName] = line.requestId;
            this.#output(
              `${this.#getPrefix(line.requestId)} ${time} ${tuiManager.makeBold('START')} ${this.#getFormattedRequestId(line.requestId)}`
            );
            return;
          case 'end':
            if (event.logStreamName && this.#activeRequestIds[event.logStreamName] === line.requestId) {
              delete this.#activeRequestIds[event.logStreamName];
            }
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
              const activeRequestId = event.logStreamName ? this.#activeRequestIds[event.logStreamName] : undefined;
              this.#output(`${this.#getPrefix(requestId ?? activeRequestId)} ${time}\n${content}`, level);
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
