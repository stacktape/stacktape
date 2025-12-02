import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Accounting {
  DefaultPurgeTimeInDays?: Value<number>;
  Mode!: Value<string>;
  constructor(properties: Accounting) {
    Object.assign(this, properties);
  }
}

export class AuthKey {
  SecretArn!: Value<string>;
  SecretVersion!: Value<string>;
  constructor(properties: AuthKey) {
    Object.assign(this, properties);
  }
}

export class Endpoint {
  PublicIpAddress?: Value<string>;
  Type!: Value<string>;
  PrivateIpAddress!: Value<string>;
  Port!: Value<string>;
  Ipv6Address?: Value<string>;
  constructor(properties: Endpoint) {
    Object.assign(this, properties);
  }
}

export class ErrorInfo {
  Message?: Value<string>;
  Code?: Value<string>;
  constructor(properties: ErrorInfo) {
    Object.assign(this, properties);
  }
}

export class Networking {
  NetworkType?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: Networking) {
    Object.assign(this, properties);
  }
}

export class Scheduler {
  Type!: Value<string>;
  Version!: Value<string>;
  constructor(properties: Scheduler) {
    Object.assign(this, properties);
  }
}

export class SlurmConfiguration {
  Accounting?: Accounting;
  AuthKey?: AuthKey;
  ScaleDownIdleTimeInSeconds?: Value<number>;
  SlurmCustomSettings?: List<SlurmCustomSetting>;
  constructor(properties: SlurmConfiguration) {
    Object.assign(this, properties);
  }
}

export class SlurmCustomSetting {
  ParameterValue!: Value<string>;
  ParameterName!: Value<string>;
  constructor(properties: SlurmCustomSetting) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  Networking: Networking;
  Scheduler: Scheduler;
  Size: Value<string>;
  SlurmConfiguration?: SlurmConfiguration;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static Accounting = Accounting;
  static AuthKey = AuthKey;
  static Endpoint = Endpoint;
  static ErrorInfo = ErrorInfo;
  static Networking = Networking;
  static Scheduler = Scheduler;
  static SlurmConfiguration = SlurmConfiguration;
  static SlurmCustomSetting = SlurmCustomSetting;
  constructor(properties: ClusterProperties) {
    super('AWS::PCS::Cluster', properties);
  }
}
