import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface EventBusPolicyProperties {
  EventBusName?: Value<string>;
  StatementId: Value<string>;
  Statement?: { [key: string]: any };
}
export default class EventBusPolicy extends ResourceBase<EventBusPolicyProperties> {
  constructor(properties: EventBusPolicyProperties) {
    super('AWS::Events::EventBusPolicy', properties);
  }
}
