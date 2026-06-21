import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IdCConfiguration {
  IdCApplicationArn?: Value<string>;
  IdCInstanceArn?: Value<string>;
  constructor(properties: IdCConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  IdCConfiguration?: IdCConfiguration;
  DefaultKmsKeyId?: Value<string>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static IdCConfiguration = IdCConfiguration;
  constructor(properties?: ApplicationProperties) {
    super('AWS::SecurityAgent::Application', properties || {});
  }
}
