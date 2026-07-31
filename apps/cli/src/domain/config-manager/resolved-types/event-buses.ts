import type { EventBus } from '@stacktape/config/event-buses';

export type StpEventBus = EventBus['properties'] & {
  name: string;
  type: EventBus['type'];
  configParentResourceType: EventBus['type'];
  nameChain: string[];
};
export type EventBusReferencableParam = 'arn' | 'archiveArn';
