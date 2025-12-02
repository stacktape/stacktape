import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ClusterPolicyProperties {
  Policy: { [key: string]: any };
  ClusterArn: Value<string>;
}
export default class ClusterPolicy extends ResourceBase<ClusterPolicyProperties> {
  constructor(properties: ClusterPolicyProperties) {
    super('AWS::MSK::ClusterPolicy', properties);
  }
}
