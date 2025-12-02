import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MountOptions {
  Version?: Value<string>;
  constructor(properties: MountOptions) {
    Object.assign(this, properties);
  }
}

export class OnPremConfig {
  AgentArns!: List<Value<string>>;
  constructor(properties: OnPremConfig) {
    Object.assign(this, properties);
  }
}
export interface LocationNFSProperties {
  Subdirectory?: Value<string>;
  ServerHostname?: Value<string>;
  MountOptions?: MountOptions;
  OnPremConfig: OnPremConfig;
  Tags?: List<ResourceTag>;
}
export default class LocationNFS extends ResourceBase<LocationNFSProperties> {
  static MountOptions = MountOptions;
  static OnPremConfig = OnPremConfig;
  constructor(properties: LocationNFSProperties) {
    super('AWS::DataSync::LocationNFS', properties);
  }
}
