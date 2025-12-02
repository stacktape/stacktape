import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TraceConfiguration {
  Vendor!: Value<string>;
  constructor(properties: TraceConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ObservabilityConfigurationProperties {
  TraceConfiguration?: TraceConfiguration;
  ObservabilityConfigurationName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ObservabilityConfiguration extends ResourceBase<ObservabilityConfigurationProperties> {
  static TraceConfiguration = TraceConfiguration;
  constructor(properties?: ObservabilityConfigurationProperties) {
    super('AWS::AppRunner::ObservabilityConfiguration', properties || {});
  }
}
