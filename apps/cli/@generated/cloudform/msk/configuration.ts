import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class LatestRevision {
  Description?: Value<string>;
  Revision?: Value<number>;
  CreationTime?: Value<string>;
  constructor(properties: LatestRevision) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationProperties {
  Description?: Value<string>;
  LatestRevision?: LatestRevision;
  ServerProperties: Value<string>;
  KafkaVersionsList?: List<Value<string>>;
  Name: Value<string>;
}
export default class Configuration extends ResourceBase<ConfigurationProperties> {
  static LatestRevision = LatestRevision;
  constructor(properties: ConfigurationProperties) {
    super('AWS::MSK::Configuration', properties);
  }
}
