import Queue_ from './queue';
import QueueInlinePolicy_ from './queueInlinePolicy';
import QueuePolicy_ from './queuePolicy';
export namespace SQS {
  export const Queue = Queue_;
  export const QueueInlinePolicy = QueueInlinePolicy_;
  export const QueuePolicy = QueuePolicy_;
  export type Queue = Queue_;
  export type QueueInlinePolicy = QueueInlinePolicy_;
  export type QueuePolicy = QueuePolicy_;
}
