import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TelemetryDestinationConfiguration {
  RetentionInDays?: Value<number>;
  DestinationPattern?: Value<string>;
  VPCFlowLogParameters?: VPCFlowLogParameters;
  DestinationType?: Value<string>;
  constructor(properties: TelemetryDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class TelemetryRuleInner {
  DestinationConfiguration?: TelemetryDestinationConfiguration;
  SelectionCriteria?: Value<string>;
  ResourceType!: Value<string>;
  TelemetryType!: Value<string>;
  constructor(properties: TelemetryRuleInner) {
    Object.assign(this, properties);
  }
}

export class VPCFlowLogParameters {
  LogFormat?: Value<string>;
  MaxAggregationInterval?: Value<number>;
  TrafficType?: Value<string>;
  constructor(properties: VPCFlowLogParameters) {
    Object.assign(this, properties);
  }
}
export interface TelemetryRuleProperties {
  Rule: TelemetryRule;
  RuleName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TelemetryRule extends ResourceBase<TelemetryRuleProperties> {
  static TelemetryDestinationConfiguration = TelemetryDestinationConfiguration;
  static TelemetryRule = TelemetryRuleInner;
  static VPCFlowLogParameters = VPCFlowLogParameters;
  constructor(properties: TelemetryRuleProperties) {
    super('AWS::ObservabilityAdmin::TelemetryRule', properties);
  }
}
