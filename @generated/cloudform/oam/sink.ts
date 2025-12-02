import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface SinkProperties {
  Policy?: { [key: string]: any };
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Sink extends ResourceBase<SinkProperties> {
  constructor(properties: SinkProperties) {
    super('AWS::Oam::Sink', properties);
  }
}
