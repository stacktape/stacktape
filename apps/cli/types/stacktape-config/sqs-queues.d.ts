import type { NextjsWeb } from '@stacktape/config/nextjs-web';
import type { SqsQueue } from '@stacktape/config/sqs-queues';

declare global {
type StpSqsQueue = SqsQueue['properties'] & {
  name: string;
  type: SqsQueue['type'];
  configParentResourceType: SqsQueue['type'] | NextjsWeb['type'];
  nameChain: string[];
};
type SqsQueueReferencableParam = 'arn' | 'name' | 'url';
}
