import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface MeteredProductProperties {
  LicenseEndpointId?: Value<string>;
  ProductId?: Value<string>;
}
export default class MeteredProduct extends ResourceBase<MeteredProductProperties> {
  constructor(properties?: MeteredProductProperties) {
    super('AWS::Deadline::MeteredProduct', properties || {});
  }
}
