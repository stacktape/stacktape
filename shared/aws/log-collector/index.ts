import type { InputLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import type { AwsSdkManager } from '../sdk-manager';
import { Writable } from 'node:stream';
import { chunkArray, chunkString, removeColoringFromString, wait } from '@shared/utils/misc';

export class LogCollectorStream extends Writable {
  #awsSdkManager: AwsSdkManager;
  #logEvents: InputLogEvent[] = [];
  #sendInterval: NodeJS.Timeout;
  #logGroupName: string;
  #logStreamName: string;
  #logStreamExists = false;
  #logGroupExists = false;
  #sendingInProgress = false;

  constructor() {
    super({
      write: (chunk, encoding, callback) => {
        const cleanedMessage = removeColoringFromString(typeof chunk !== 'string' ? JSON.stringify(chunk) : chunk);
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
    this.#sendInterval = setInterval(this.#sendLogs, 3000);
  };

  #sendLogs = async () => {
    if (!this.#awsSdkManager.isInitialized) {
      return;
    }
    if (this.#sendingInProgress) {
      return;
    }
    this.#sendingInProgress = true;
    if (!this.#logGroupExists) {
      let logGroup = await this.#awsSdkManager.getLogGroup({ logGroupName: this.#logGroupName });
      if (!logGroup) {
        await this.#awsSdkManager.createLogGroup({
          logGroupName: this.#logGroupName
        });
      }
      while (!logGroup) {
        await wait(1000);
        logGroup = await this.#awsSdkManager.getLogGroup({ logGroupName: this.#logGroupName });
      }
      this.#logGroupExists = true;
    }

    if (!this.#logStreamExists) {
      await this.#awsSdkManager.createLogStream({
        logGroupName: this.#logGroupName,
        logStreamName: this.#logStreamName
      });
      this.#logStreamExists = true;
    }

    const eventsToSend: InputLogEvent[] = this.#logEvents.splice(0); // .reverse();
    if (eventsToSend.length) {
      try {
        for (const chunk of chunkArray(eventsToSend, 10000)) {
          await this.#awsSdkManager.putLogEvents({
            logGroupName: this.#logGroupName,
            logStreamName: this.#logStreamName,
            logEvents: chunk
          });
        }
      } catch (err) {
        this.#logEvents = eventsToSend.concat(this.#logEvents);
        this.#sendingInProgress = false;
        throw err;
      }
    }
    this.#sendingInProgress = false;
  };

  makeFinalSend: CleanupHookFunction = async () => {
    clearInterval(this.#sendInterval);
    await wait(1000);
    return this.#sendLogs();
  };

  //   pushLog = ({ logMessage }: { logMessage: string }) => {
  //     this.#logEvents.push({ message: logMessage, timestamp: Date.now() });
  //   };
}
