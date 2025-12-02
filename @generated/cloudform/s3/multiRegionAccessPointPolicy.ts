import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class PolicyStatus {
  IsPublic!: Value<string>;
  constructor(properties: PolicyStatus) {
    Object.assign(this, properties);
  }
}
export interface MultiRegionAccessPointPolicyProperties {
  Policy: { [key: string]: any };
  MrapName: Value<string>;
}
export default class MultiRegionAccessPointPolicy extends ResourceBase<MultiRegionAccessPointPolicyProperties> {
  static PolicyStatus = PolicyStatus;
  constructor(properties: MultiRegionAccessPointPolicyProperties) {
    super('AWS::S3::MultiRegionAccessPointPolicy', properties);
  }
}
