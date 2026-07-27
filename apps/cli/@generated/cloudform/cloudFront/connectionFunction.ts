import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectionFunctionConfig {
  Comment!: Value<string>;
  Runtime!: Value<string>;
  KeyValueStoreAssociations?: List<KeyValueStoreAssociation>;
  constructor(properties: ConnectionFunctionConfig) {
    Object.assign(this, properties);
  }
}

export class KeyValueStoreAssociation {
  KeyValueStoreARN!: Value<string>;
  constructor(properties: KeyValueStoreAssociation) {
    Object.assign(this, properties);
  }
}
export interface ConnectionFunctionProperties {
  ConnectionFunctionConfig: ConnectionFunctionConfig;
  AutoPublish?: Value<boolean>;
  ConnectionFunctionCode: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ConnectionFunction extends ResourceBase<ConnectionFunctionProperties> {
  static ConnectionFunctionConfig = ConnectionFunctionConfig;
  static KeyValueStoreAssociation = KeyValueStoreAssociation;
  constructor(properties: ConnectionFunctionProperties) {
    super('AWS::CloudFront::ConnectionFunction', properties);
  }
}
