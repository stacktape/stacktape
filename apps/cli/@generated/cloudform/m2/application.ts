import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Definition {
  Content?: Value<string>;
  S3Location?: Value<string>;
  constructor(properties: Definition) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  Description?: Value<string>;
  KmsKeyId?: Value<string>;
  Definition?: Definition;
  EngineType: Value<string>;
  RoleArn?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static Definition = Definition;
  constructor(properties: ApplicationProperties) {
    super('AWS::M2::Application', properties);
  }
}
