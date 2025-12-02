import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class RuntimeEnvironment {
  Type!: Value<string>;
  Version!: Value<string>;
  constructor(properties: RuntimeEnvironment) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  ApplicationLogPaths?: List<Value<string>>;
  ApplicationLogOutputUri?: Value<string>;
  ApplicationSourceUri: Value<string>;
  Description: Value<string>;
  RuntimeEnvironment: RuntimeEnvironment;
  ExecutablePath: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static RuntimeEnvironment = RuntimeEnvironment;
  constructor(properties: ApplicationProperties) {
    super('AWS::GameLiftStreams::Application', properties);
  }
}
