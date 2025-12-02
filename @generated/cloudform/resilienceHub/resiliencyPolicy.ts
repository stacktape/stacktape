import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FailurePolicy {
  RpoInSecs!: Value<number>;
  RtoInSecs!: Value<number>;
  constructor(properties: FailurePolicy) {
    Object.assign(this, properties);
  }
}

export class PolicyMap {
  AZ!: FailurePolicy;
  Region?: FailurePolicy;
  Hardware!: FailurePolicy;
  Software!: FailurePolicy;
  constructor(properties: PolicyMap) {
    Object.assign(this, properties);
  }
}
export interface ResiliencyPolicyProperties {
  Policy: PolicyMap;
  PolicyDescription?: Value<string>;
  Tier: Value<string>;
  PolicyName: Value<string>;
  DataLocationConstraint?: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class ResiliencyPolicy extends ResourceBase<ResiliencyPolicyProperties> {
  static FailurePolicy = FailurePolicy;
  static PolicyMap = PolicyMap;
  constructor(properties: ResiliencyPolicyProperties) {
    super('AWS::ResilienceHub::ResiliencyPolicy', properties);
  }
}
