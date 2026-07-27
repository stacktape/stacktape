import type { StackEvent } from '@aws-sdk/client-cloudformation';
import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import type { AwsSdkManager } from './sdk-manager';
import { ResourceStatus } from '@aws-sdk/client-cloudformation';
import { ProvisionedConcurrencyStatusEnum } from '@aws-sdk/client-lambda';
import { consoleLinks } from '@shared/naming/console-links';
import { wait } from '@shared/utils/misc';

export class LambdaProvisionedConcurrencyPoller {
  #functionName: string;
  #aliasName: string;
  #pollerPrintName?: string;
  #awsSdkManager: AwsSdkManager;
  #pollInterval: NodeJS.Timeout;
  #pollInProgress = false;
  #printer?: Printer;
  #failureReason?: string;
  #failedLogs: FilteredLogEvent[] = [];
  #logStreamName?: string;
  #warnMessagePrinted = false;
  #logGroupName?: string;
  #startTime: Date;

  constructor({
    functionName,
    aliasName,
    pollerPrintName,
    awsSdkManager,
    logGroupName
  }: {
    functionName: string;
    aliasName: string;
    pollerPrintName?: string;
    awsSdkManager: AwsSdkManager;
    logGroupName?: string;
  }) {
    this.#functionName = functionName;
    this.#aliasName = aliasName;
    this.#awsSdkManager = awsSdkManager;
    this.#printer = this.#awsSdkManager.printer;
    this.#pollerPrintName = pollerPrintName || functionName;
    this.#logGroupName = logGroupName;
    this.#startTime = new Date();
    this.#pollInterval = setInterval(this.#pollStatus, 5000);
  }

  #pollStatus = async () => {
    if (this.#pollInProgress || this.#warnMessagePrinted) {
      return;
    }

    this.#pollInProgress = true;

    // If we already found a failure, stop polling and print warning
    if (this.#failureReason) {
      this.stopPolling();
      this.#pollInProgress = false;
      this.printWarningMessage();
      return;
    }

    try {
      const config = await this.#awsSdkManager.getProvisionedConcurrencyConfig({
        functionName: this.#functionName,
        qualifier: this.#aliasName
      });

      if (config.Status === ProvisionedConcurrencyStatusEnum.FAILED) {
        this.#failureReason = config.StatusReason || 'Unknown reason';

        // Wait for logs to be delivered before fetching them
        await wait(20000);

        await this.#fetchLogs();
      }
    } catch {}

    this.#pollInProgress = false;
  };

  #fetchLogs = async () => {
    if (!this.#logGroupName) {
      return;
    }

    try {
      const logStreams = await this.#awsSdkManager.getLogStreams({
        logGroupName: this.#logGroupName,
        limit: 10,
        orderBy: 'LastEventTime'
      });

      // Find streams created after our start time (these are the provisioned concurrency init streams)
      const recentStreams = logStreams.filter(
        (stream) => stream.creationTime && new Date(stream.creationTime) >= this.#startTime
      );

      // If no streams found after start time, use the most recent ones
      const streamsToUse = recentStreams.length > 0 ? recentStreams : logStreams.slice(0, 3);

      if (streamsToUse.length > 0) {
        // Get the most recent stream for the link
        this.#logStreamName = streamsToUse[0].logStreamName;

        // Fetch logs from these streams
        const logs = await this.#awsSdkManager.getLogEvents({
          logGroupName: this.#logGroupName,
          logStreamNames: streamsToUse.map((s) => s.logStreamName),
          startTime: this.#startTime.getTime()
        });

        this.#failedLogs = this.#filterRelevantLogs(logs || []);
      }
    } catch {
      // Ignore log fetching errors
    }
  };

  #filterRelevantLogs(logs: FilteredLogEvent[]): FilteredLogEvent[] {
    const noisePatterns = [/DeprecationWarning/i, /ExperimentalWarning/i, /\(Use `node --trace/i];

    return logs.filter(({ message }) => {
      if (!message) return false;
      // Always keep error-related messages
      if (/error|exception|fatal|failed|crash|timeout/i.test(message)) return true;
      if (/^\s+at\s+/.test(message)) return true; // Stack trace lines
      // Filter out noise
      return !noisePatterns.some((pattern) => pattern.test(message));
    });
  }

  getFailureMessage() {
    if (!this.#printer || !this.#failureReason) {
      return undefined;
    }

    const lines: string[] = [];

    // Show the failure reason from AWS
    lines.push(`Reason: ${this.#failureReason}`);

    // Lambda logs - show only relevant lines
    if (this.#failedLogs.length > 0) {
      lines.push('');
      lines.push(this.#printer.colorize('gray', 'Last logs before failure:'));

      // Limit to last 15 relevant log lines
      const logsToShow = this.#failedLogs.slice(-15);
      for (const { timestamp, message: logMessage } of logsToShow) {
        const time = new Date(timestamp).toTimeString().split(' ')[0];
        const trimmedMessage = logMessage.trim();
        lines.push(`  ${this.#printer.colorize('gray', time)} ${trimmedMessage}`);
      }

      if (this.#failedLogs.length > 15) {
        lines.push(`  ${this.#printer.colorize('gray', `... ${this.#failedLogs.length - 15} earlier lines omitted`)}`);
      }
    }

    // AWS Console links
    lines.push('');
    if (this.#logGroupName && this.#logStreamName) {
      const logStreamLink = consoleLinks.logStream(this.#awsSdkManager.region, this.#logGroupName, this.#logStreamName);
      lines.push(this.#printer.terminalLink('Full logs', logStreamLink));
    } else if (this.#logGroupName) {
      const logGroupLink = consoleLinks.logGroup(this.#awsSdkManager.region, this.#logGroupName);
      lines.push(this.#printer.terminalLink('Function logs', logGroupLink));
    }

    return lines.join('\n');
  }

  printWarningMessage = () => {
    if (this.#printer) {
      const failureMessage = this.getFailureMessage();
      if (failureMessage) {
        this.#printer.warn(`[${this.#pollerPrintName}] Provisioned concurrency failed\n${failureMessage}`);
        this.#printer.hint('The function may have an initialization error. Check logs for errors during cold start.');
      }
      this.#warnMessagePrinted = true;
    }
  };

  async handleFailure(statusReason: string) {
    this.stopPolling();

    // Extract the reason if possible
    const match = statusReason.match(/Reason:\s*(\w+)/);
    if (match) {
      this.#failureReason = match[1];
    } else {
      this.#failureReason = statusReason;
    }

    // Wait for logs to be delivered before fetching them
    await wait(20000);

    await this.#fetchLogs();
  }

  get hasFailure() {
    return Boolean(this.#failureReason) && !this.#pollInProgress;
  }

  get failureReason() {
    return this.#failureReason;
  }

  stopPolling = () => {
    clearInterval(this.#pollInterval);
  };
}

export const isLambdaAliasProvisionedConcurrencyEvent = (stackEvent: StackEvent) =>
  stackEvent.ResourceType === 'AWS::Lambda::Alias' &&
  (stackEvent.ResourceStatus === ResourceStatus.CREATE_IN_PROGRESS ||
    stackEvent.ResourceStatus === ResourceStatus.UPDATE_IN_PROGRESS);

export const isLambdaAliasProvisionedConcurrencyFailedEvent = (stackEvent: StackEvent) =>
  stackEvent.ResourceType === 'AWS::Lambda::Alias' &&
  (stackEvent.ResourceStatus === ResourceStatus.CREATE_FAILED ||
    stackEvent.ResourceStatus === ResourceStatus.UPDATE_FAILED) &&
  stackEvent.ResourceStatusReason?.includes('Provisioned Concurrency');
