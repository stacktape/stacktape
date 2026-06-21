import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TelemetryEnrichmentProperties {
  Scope?: Value<string>;
}
export default class TelemetryEnrichment extends ResourceBase<TelemetryEnrichmentProperties> {
  constructor(properties?: TelemetryEnrichmentProperties) {
    super('AWS::ObservabilityAdmin::TelemetryEnrichment', properties || {});
  }
}
