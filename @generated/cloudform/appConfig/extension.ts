import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Parameter {
  Dynamic?: Value<boolean>;
  Description?: Value<string>;
  Required!: Value<boolean>;
  constructor(properties: Parameter) {
    Object.assign(this, properties);
  }
}
export interface ExtensionProperties {
  Description?: Value<string>;
  Parameters?: { [key: string]: Parameter };
  Actions: { [key: string]: any };
  LatestVersionNumber?: Value<number>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Extension extends ResourceBase<ExtensionProperties> {
  static Parameter = Parameter;
  constructor(properties: ExtensionProperties) {
    super('AWS::AppConfig::Extension', properties);
  }
}
