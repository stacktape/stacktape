import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface MonitorProperties {
  IdentityCenterInstanceArn: Value<string>;
  Subdomain: Value<string>;
  DisplayName: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Monitor extends ResourceBase<MonitorProperties> {
  constructor(properties: MonitorProperties) {
    super('AWS::Deadline::Monitor', properties);
  }
}
