import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MultitrackInputConfiguration {
  MaximumResolution?: Value<string>;
  Policy?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: MultitrackInputConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ChannelProperties {
  Type?: Value<string>;
  RecordingConfigurationArn?: Value<string>;
  Authorized?: Value<boolean>;
  MultitrackInputConfiguration?: MultitrackInputConfiguration;
  Preset?: Value<string>;
  ContainerFormat?: Value<string>;
  InsecureIngest?: Value<boolean>;
  LatencyMode?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Channel extends ResourceBase<ChannelProperties> {
  static MultitrackInputConfiguration = MultitrackInputConfiguration;
  constructor(properties?: ChannelProperties) {
    super('AWS::IVS::Channel', properties || {});
  }
}
