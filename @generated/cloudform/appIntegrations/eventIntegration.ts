import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EventFilter {
  Source!: Value<string>;
  constructor(properties: EventFilter) {
    Object.assign(this, properties);
  }
}
export interface EventIntegrationProperties {
  Description?: Value<string>;
  EventBridgeBus: Value<string>;
  EventFilter: EventFilter;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class EventIntegration extends ResourceBase<EventIntegrationProperties> {
  static EventFilter = EventFilter;
  constructor(properties: EventIntegrationProperties) {
    super('AWS::AppIntegrations::EventIntegration', properties);
  }
}
