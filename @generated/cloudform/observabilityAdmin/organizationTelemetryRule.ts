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

export class TelemetryRule {
  DestinationConfiguration?: TelemetryDestinationConfiguration;
  Scope?: Value<string>;
  SelectionCriteria?: Value<string>;
  ResourceType!: Value<string>;
  TelemetryType!: Value<string>;
  constructor(properties: TelemetryRule) {
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
export interface OrganizationTelemetryRuleProperties {
  Rule: TelemetryRule;
  RuleName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class OrganizationTelemetryRule extends ResourceBase<OrganizationTelemetryRuleProperties> {
  static TelemetryDestinationConfiguration = TelemetryDestinationConfiguration;
  static TelemetryRule = TelemetryRule;
  static VPCFlowLogParameters = VPCFlowLogParameters;
  constructor(properties: OrganizationTelemetryRuleProperties) {
    super('AWS::ObservabilityAdmin::OrganizationTelemetryRule', properties);
  }
}
