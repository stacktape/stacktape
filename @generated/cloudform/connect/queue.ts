import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class OutboundCallerConfig {
  OutboundCallerIdNumberArn?: Value<string>;
  OutboundFlowArn?: Value<string>;
  OutboundCallerIdName?: Value<string>;
  constructor(properties: OutboundCallerConfig) {
    Object.assign(this, properties);
  }
}

export class OutboundEmailConfig {
  OutboundEmailAddressId?: Value<string>;
  constructor(properties: OutboundEmailConfig) {
    Object.assign(this, properties);
  }
}
export interface QueueProperties {
  Status?: Value<string>;
  HoursOfOperationArn: Value<string>;
  Description?: Value<string>;
  InstanceArn: Value<string>;
  OutboundEmailConfig?: OutboundEmailConfig;
  QuickConnectArns?: List<Value<string>>;
  OutboundCallerConfig?: OutboundCallerConfig;
  MaxContacts?: Value<number>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Queue extends ResourceBase<QueueProperties> {
  static OutboundCallerConfig = OutboundCallerConfig;
  static OutboundEmailConfig = OutboundEmailConfig;
  constructor(properties: QueueProperties) {
    super('AWS::Connect::Queue', properties);
  }
}
