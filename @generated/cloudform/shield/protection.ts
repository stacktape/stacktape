import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  Block?: { [key: string]: any };
  Count?: { [key: string]: any };
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class ApplicationLayerAutomaticResponseConfiguration {
  Status!: Value<string>;
  Action!: Action;
  constructor(properties: ApplicationLayerAutomaticResponseConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ProtectionProperties {
  ResourceArn: Value<string>;
  HealthCheckArns?: List<Value<string>>;
  ApplicationLayerAutomaticResponseConfiguration?: ApplicationLayerAutomaticResponseConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Protection extends ResourceBase<ProtectionProperties> {
  static Action = Action;
  static ApplicationLayerAutomaticResponseConfiguration = ApplicationLayerAutomaticResponseConfiguration;
  constructor(properties: ProtectionProperties) {
    super('AWS::Shield::Protection', properties);
  }
}
