import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigurationId {
  Revision!: Value<number>;
  Id!: Value<string>;
  constructor(properties: ConfigurationId) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationAssociationProperties {
  Broker: Value<string>;
  Configuration: ConfigurationId;
}
export default class ConfigurationAssociation extends ResourceBase<ConfigurationAssociationProperties> {
  static ConfigurationId = ConfigurationId;
  constructor(properties: ConfigurationAssociationProperties) {
    super('AWS::AmazonMQ::ConfigurationAssociation', properties);
  }
}
