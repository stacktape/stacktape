import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CommandParameter {
  DefaultValue?: CommandParameterValue;
  Description?: Value<string>;
  Value?: CommandParameterValue;
  Name!: Value<string>;
  constructor(properties: CommandParameter) {
    Object.assign(this, properties);
  }
}

export class CommandParameterValue {
  B?: Value<boolean>;
  S?: Value<string>;
  D?: Value<number>;
  BIN?: Value<string>;
  UL?: Value<string>;
  I?: Value<number>;
  L?: Value<string>;
  constructor(properties: CommandParameterValue) {
    Object.assign(this, properties);
  }
}

export class CommandPayload {
  ContentType?: Value<string>;
  Content?: Value<string>;
  constructor(properties: CommandPayload) {
    Object.assign(this, properties);
  }
}
export interface CommandProperties {
  Description?: Value<string>;
  LastUpdatedAt?: Value<string>;
  Deprecated?: Value<boolean>;
  CreatedAt?: Value<string>;
  DisplayName?: Value<string>;
  Payload?: CommandPayload;
  CommandId: Value<string>;
  PendingDeletion?: Value<boolean>;
  MandatoryParameters?: List<CommandParameter>;
  Namespace?: Value<string>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Command extends ResourceBase<CommandProperties> {
  static CommandParameter = CommandParameter;
  static CommandParameterValue = CommandParameterValue;
  static CommandPayload = CommandPayload;
  constructor(properties: CommandProperties) {
    super('AWS::IoT::Command', properties);
  }
}
