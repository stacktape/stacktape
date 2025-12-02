import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DestinationDetails {
  Status!: Value<string>;
  Uri!: Value<string>;
  constructor(properties: DestinationDetails) {
    Object.assign(this, properties);
  }
}
export interface EventStreamProperties {
  DomainName: Value<string>;
  EventStreamName: Value<string>;
  Uri: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class EventStream extends ResourceBase<EventStreamProperties> {
  static DestinationDetails = DestinationDetails;
  constructor(properties: EventStreamProperties) {
    super('AWS::CustomerProfiles::EventStream', properties);
  }
}
