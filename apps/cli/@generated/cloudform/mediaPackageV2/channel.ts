import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IngestEndpoint {
  Id?: Value<string>;
  Url?: Value<string>;
  constructor(properties: IngestEndpoint) {
    Object.assign(this, properties);
  }
}

export class InputSwitchConfiguration {
  PreferredInput?: Value<number>;
  MQCSInputSwitching?: Value<boolean>;
  constructor(properties: InputSwitchConfiguration) {
    Object.assign(this, properties);
  }
}

export class OutputHeaderConfiguration {
  PublishMQCS?: Value<boolean>;
  constructor(properties: OutputHeaderConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ChannelProperties {
  InputSwitchConfiguration?: InputSwitchConfiguration;
  ChannelName: Value<string>;
  Description?: Value<string>;
  InputType?: Value<string>;
  OutputHeaderConfiguration?: OutputHeaderConfiguration;
  ChannelGroupName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Channel extends ResourceBase<ChannelProperties> {
  static IngestEndpoint = IngestEndpoint;
  static InputSwitchConfiguration = InputSwitchConfiguration;
  static OutputHeaderConfiguration = OutputHeaderConfiguration;
  constructor(properties: ChannelProperties) {
    super('AWS::MediaPackageV2::Channel', properties);
  }
}
