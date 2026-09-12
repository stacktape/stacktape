import type { CleanupHookFunction } from '@application-services/application-manager/types';
import type { AwsSdkManager } from '../sdk-manager';
import { Writable } from 'node:stream';
import { chunkString, removeColoringFromString, wait } from '@utils/misc';

type LogEvent = { message: string; timestamp: number };

export class LogCollectorStream extends Writable {
  #awsSdkManager: AwsSdkManager;
  #logEvents: LogEvent[] = [];
  #sendInterval: NodeJS.Timeout | undefined;
  #logGroupName: string;
  #logStreamName: string;
  #logStreamExists = false;
  #logGroupExists = false;
  #sendingInProgress: Promise<void> | undefined;

  constructor() {
    super({
      write: (chunk, encoding, callback) => {
        const cleanedMessage = removeColoringFromString(this.#serializeChunk(chunk, encoding));
        const chunks = chunkString(cleanedMessage, 50 * 1000);
        chunks.forEach((messageChunk) => this.#logEvents.push({ message: messageChunk, timestamp: Date.now() }));
        callback();
      },
      objectMode: true
    });
  }

  init = ({
    awsSdkManager,
    logGroupName,
    logStreamName
  }: {
    awsSdkManager: AwsSdkManager;
    logGroupName: string;
    logStreamName: string;
  }) => {
    this.#logGroupName = logGroupName;
    this.#logStreamName = logStreamName;
    this.#awsSdkManager = awsSdkManager;
    this.#sendInterval = setInterval(() => {
      void this.#sendLogs().catch(() => {
        // noop: keep retrying on subsequent interval/final flush
      });
    }, 3000);
  };

  #serializeChunk = (chunk: unknown, encoding: BufferEncoding): string => {
    if (typeof chunk === 'string') {
      return chunk;
    }
    if (Buffer.isBuffer(chunk)) {
      return chunk.toString(encoding || 'utf8');
    }
    if (chunk === null || chunk === undefined) {
      return '';
    }
    if (typeof chunk === 'object') {
      try {
        return JSON.stringify(chunk);
      } catch {
        return String(chunk);
      }
    }
    return String(chunk);
  };

  #sendLogs = (): Promise<void> => {
    if (!this.#awsSdkManager.isInitialized) {
      return Promise.resolve();
    }
    if (this.#sendingInProgress) {
      return this.#sendingInProgress;
    }
    this.#sendingInProgress = this.#flushLogs().finally(() => {
      this.#sendingInProgress = undefined;
    });
    return this.#sendingInProgress;
  };

  #flushLogs = async () => {
    if (!this.#logGroupExists) {
      let logGroup = await this.#awsSdkManager.observability.getLogGroup({ logGroupName: this.#logGroupName });
      if (!logGroup) {
        await this.#awsSdkManager.observability.createLogGroup({
          logGroupName: this.#logGroupName
        });
      }
      while (!logGroup) {
        await wait(1000);
        logGroup = await this.#awsSdkManager.observability.getLogGroup({ logGroupName: this.#logGroupName });
      }
      this.#logGroupExists = true;
    }

    if (!this.#logStreamExists) {
      await this.#awsSdkManager.observability.createLogStream({
        logGroupName: this.#logGroupName,
        logStreamName: this.#logStreamName
      });
      this.#logStreamExists = true;
    }

    // Wall-clock corrections can reorder timestamps even when writes are serialized.
    const eventsToSend = this.#logEvents.splice(0).sort((left, right) => left.timestamp - right.timestamp);
    let sent = 0;
    try {
      while (sent < eventsToSend.length) {
        let end = sent;
        let bytes = 0;
        // CloudWatch limits bytes (UTF-8 plus 26/event), count and timestamp span independently.
        while (end < eventsToSend.length && end - sent < 10_000) {
          const event = eventsToSend[end];
          const eventBytes = Buffer.byteLength(event.message, 'utf8') + 26;
          if (bytes + eventBytes > 1_048_576 || event.timestamp - eventsToSend[sent].timestamp > 86_400_000) break;
          bytes += eventBytes;
          end++;
        }
        await this.#awsSdkManager.observability.putLogEvents({
          logGroupName: this.#logGroupName,
          logStreamName: this.#logStreamName,
          logEvents: eventsToSend.slice(sent, end)
        });
        sent = end;
      }
    } catch (err) {
      this.#logEvents = eventsToSend.slice(sent).concat(this.#logEvents);
      throw err;
    }
  };

  makeFinalSend: CleanupHookFunction = async () => {
    if (this.#sendInterval) {
      clearInterval(this.#sendInterval);
      this.#sendInterval = undefined;
    }
    // An interval flush may still be running. Wait for it, then include writes that arrived during that request.
    await this.#sendingInProgress?.catch(() => {});
    return this.#sendLogs();
  };
}
