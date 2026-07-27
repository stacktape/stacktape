import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransactionSearchConfigProperties {
  IndexingPercentage?: Value<number>;
}
export default class TransactionSearchConfig extends ResourceBase<TransactionSearchConfigProperties> {
  constructor(properties?: TransactionSearchConfigProperties) {
    super('AWS::XRay::TransactionSearchConfig', properties || {});
  }
}
