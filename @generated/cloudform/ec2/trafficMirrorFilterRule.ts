import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TrafficMirrorPortRange {
  FromPort!: Value<number>;
  ToPort!: Value<number>;
  constructor(properties: TrafficMirrorPortRange) {
    Object.assign(this, properties);
  }
}
export interface TrafficMirrorFilterRuleProperties {
  DestinationPortRange?: TrafficMirrorPortRange;
  Description?: Value<string>;
  SourcePortRange?: TrafficMirrorPortRange;
  RuleAction: Value<string>;
  SourceCidrBlock: Value<string>;
  RuleNumber: Value<number>;
  DestinationCidrBlock: Value<string>;
  TrafficMirrorFilterId: Value<string>;
  TrafficDirection: Value<string>;
  Protocol?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class TrafficMirrorFilterRule extends ResourceBase<TrafficMirrorFilterRuleProperties> {
  static TrafficMirrorPortRange = TrafficMirrorPortRange;
  constructor(properties: TrafficMirrorFilterRuleProperties) {
    super('AWS::EC2::TrafficMirrorFilterRule', properties);
  }
}
