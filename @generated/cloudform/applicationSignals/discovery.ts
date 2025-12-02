import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DiscoveryProperties {}
export default class Discovery extends ResourceBase<DiscoveryProperties> {
  constructor(properties?: DiscoveryProperties) {
    super('AWS::ApplicationSignals::Discovery', properties || {});
  }
}
