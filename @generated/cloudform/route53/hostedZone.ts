import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class HostedZoneConfig {
  Comment?: Value<string>;
  constructor(properties: HostedZoneConfig) {
    Object.assign(this, properties);
  }
}

export class HostedZoneTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: HostedZoneTag) {
    Object.assign(this, properties);
  }
}

export class QueryLoggingConfig {
  CloudWatchLogsLogGroupArn!: Value<string>;
  constructor(properties: QueryLoggingConfig) {
    Object.assign(this, properties);
  }
}

export class VPC {
  VPCRegion!: Value<string>;
  VPCId!: Value<string>;
  constructor(properties: VPC) {
    Object.assign(this, properties);
  }
}
export interface HostedZoneProperties {
  HostedZoneTags?: List<HostedZoneTag>;
  VPCs?: List<VPC>;
  HostedZoneConfig?: HostedZoneConfig;
  QueryLoggingConfig?: QueryLoggingConfig;
  Name?: Value<string>;
}
export default class HostedZone extends ResourceBase<HostedZoneProperties> {
  static HostedZoneConfig = HostedZoneConfig;
  static HostedZoneTag = HostedZoneTag;
  static QueryLoggingConfig = QueryLoggingConfig;
  static VPC = VPC;
  constructor(properties?: HostedZoneProperties) {
    super('AWS::Route53::HostedZone', properties || {});
  }
}
