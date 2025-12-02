import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ClusterEndpoint {
  Endpoint?: Value<string>;
  Region?: Value<string>;
  constructor(properties: ClusterEndpoint) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  NetworkType?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static ClusterEndpoint = ClusterEndpoint;
  constructor(properties: ClusterProperties) {
    super('AWS::Route53RecoveryControl::Cluster', properties);
  }
}
