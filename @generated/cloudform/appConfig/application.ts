import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Tags {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  Description?: Value<string>;
  Tags?: List<Tags>;
  Name: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static Tags = Tags;
  constructor(properties: ApplicationProperties) {
    super('AWS::AppConfig::Application', properties);
  }
}
