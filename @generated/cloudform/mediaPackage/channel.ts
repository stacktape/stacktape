import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class HlsIngest {
  ingestEndpoints?: List<IngestEndpoint>;
  constructor(properties: HlsIngest) {
    Object.assign(this, properties);
  }
}

export class IngestEndpoint {
  Username!: Value<string>;
  Id!: Value<string>;
  Url!: Value<string>;
  Password!: Value<string>;
  constructor(properties: IngestEndpoint) {
    Object.assign(this, properties);
  }
}

export class LogConfiguration {
  LogGroupName?: Value<string>;
  constructor(properties: LogConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ChannelProperties {
  Description?: Value<string>;
  IngressAccessLogs?: LogConfiguration;
  HlsIngest?: HlsIngest;
  Id: Value<string>;
  EgressAccessLogs?: LogConfiguration;
  Tags?: List<ResourceTag>;
}
export default class Channel extends ResourceBase<ChannelProperties> {
  static HlsIngest = HlsIngest;
  static IngestEndpoint = IngestEndpoint;
  static LogConfiguration = LogConfiguration;
  constructor(properties: ChannelProperties) {
    super('AWS::MediaPackage::Channel', properties);
  }
}
