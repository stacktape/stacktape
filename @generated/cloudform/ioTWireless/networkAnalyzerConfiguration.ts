import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TraceContent {
  WirelessDeviceFrameInfo?: Value<string>;
  LogLevel?: Value<string>;
  constructor(properties: TraceContent) {
    Object.assign(this, properties);
  }
}
export interface NetworkAnalyzerConfigurationProperties {
  Description?: Value<string>;
  TraceContent?: TraceContent;
  WirelessGateways?: List<Value<string>>;
  WirelessDevices?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class NetworkAnalyzerConfiguration extends ResourceBase<NetworkAnalyzerConfigurationProperties> {
  static TraceContent = TraceContent;
  constructor(properties: NetworkAnalyzerConfigurationProperties) {
    super('AWS::IoTWireless::NetworkAnalyzerConfiguration', properties);
  }
}
