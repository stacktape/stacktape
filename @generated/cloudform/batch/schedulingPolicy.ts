import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FairsharePolicy {
  ShareDistribution?: List<ShareAttributes>;
  ShareDecaySeconds?: Value<number>;
  ComputeReservation?: Value<number>;
  constructor(properties: FairsharePolicy) {
    Object.assign(this, properties);
  }
}

export class ShareAttributes {
  WeightFactor?: Value<number>;
  ShareIdentifier?: Value<string>;
  constructor(properties: ShareAttributes) {
    Object.assign(this, properties);
  }
}
export interface SchedulingPolicyProperties {
  FairsharePolicy?: FairsharePolicy;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class SchedulingPolicy extends ResourceBase<SchedulingPolicyProperties> {
  static FairsharePolicy = FairsharePolicy;
  static ShareAttributes = ShareAttributes;
  constructor(properties?: SchedulingPolicyProperties) {
    super('AWS::Batch::SchedulingPolicy', properties || {});
  }
}
