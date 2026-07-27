import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface InstanceProperties {
  InstanceAttributes: { [key: string]: any };
  InstanceId?: Value<string>;
  ServiceId: Value<string>;
}
export default class Instance extends ResourceBase<InstanceProperties> {
  constructor(properties: InstanceProperties) {
    super('AWS::ServiceDiscovery::Instance', properties);
  }
}
