import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MediaResource {
  Destinations?: List<MediaResourceNeighbor>;
  Sources?: List<MediaResourceNeighbor>;
  Name?: Value<string>;
  constructor(properties: MediaResource) {
    Object.assign(this, properties);
  }
}

export class MediaResourceNeighbor {
  Arn!: Value<string>;
  Name?: Value<string>;
  constructor(properties: MediaResourceNeighbor) {
    Object.assign(this, properties);
  }
}

export class MonitorDeployment {
  DetailsUri?: Value<string>;
  Status!: Value<string>;
  ErrorMessage?: Value<string>;
  constructor(properties: MonitorDeployment) {
    Object.assign(this, properties);
  }
}

export class SuccessfulMonitorDeployment {
  DetailsUri!: Value<string>;
  Status!: Value<string>;
  constructor(properties: SuccessfulMonitorDeployment) {
    Object.assign(this, properties);
  }
}
export interface SignalMapProperties {
  Description?: Value<string>;
  EventBridgeRuleTemplateGroupIdentifiers?: List<Value<string>>;
  DiscoveryEntryPointArn: Value<string>;
  CloudWatchAlarmTemplateGroupIdentifiers?: List<Value<string>>;
  ForceRediscovery?: Value<boolean>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class SignalMap extends ResourceBase<SignalMapProperties> {
  static MediaResource = MediaResource;
  static MediaResourceNeighbor = MediaResourceNeighbor;
  static MonitorDeployment = MonitorDeployment;
  static SuccessfulMonitorDeployment = SuccessfulMonitorDeployment;
  constructor(properties: SignalMapProperties) {
    super('AWS::MediaLive::SignalMap', properties);
  }
}
