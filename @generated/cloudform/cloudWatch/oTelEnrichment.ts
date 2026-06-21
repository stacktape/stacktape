import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface OTelEnrichmentProperties {}
export default class OTelEnrichment extends ResourceBase<OTelEnrichmentProperties> {
  constructor(properties?: OTelEnrichmentProperties) {
    super('AWS::CloudWatch::OTelEnrichment', properties || {});
  }
}
