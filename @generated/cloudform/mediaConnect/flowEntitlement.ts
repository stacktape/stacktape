import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Encryption {
  SecretArn?: Value<string>;
  KeyType?: Value<string>;
  ResourceId?: Value<string>;
  DeviceId?: Value<string>;
  Region?: Value<string>;
  ConstantInitializationVector?: Value<string>;
  Algorithm!: Value<string>;
  RoleArn!: Value<string>;
  Url?: Value<string>;
  constructor(properties: Encryption) {
    Object.assign(this, properties);
  }
}
export interface FlowEntitlementProperties {
  DataTransferSubscriberFeePercent?: Value<number>;
  Description: Value<string>;
  Encryption?: Encryption;
  Subscribers: List<Value<string>>;
  FlowArn: Value<string>;
  EntitlementStatus?: Value<string>;
  Name: Value<string>;
}
export default class FlowEntitlement extends ResourceBase<FlowEntitlementProperties> {
  static Encryption = Encryption;
  constructor(properties: FlowEntitlementProperties) {
    super('AWS::MediaConnect::FlowEntitlement', properties);
  }
}
