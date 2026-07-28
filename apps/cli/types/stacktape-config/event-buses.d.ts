import type { EventBus } from '@stacktape/config/event-buses';

declare global {
type StpEventBus = EventBus['properties'] & {
  name: string;
  type: EventBus['type'];
  configParentResourceType: EventBus['type'];
  nameChain: string[];
};
type EventBusReferencableParam = 'arn' | 'archiveArn';
}
