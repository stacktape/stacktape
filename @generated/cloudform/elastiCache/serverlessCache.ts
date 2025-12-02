import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CacheUsageLimits {
  DataStorage?: DataStorage;
  ECPUPerSecond?: ECPUPerSecond;
  constructor(properties: CacheUsageLimits) {
    Object.assign(this, properties);
  }
}

export class DataStorage {
  Minimum?: Value<number>;
  Maximum?: Value<number>;
  Unit!: Value<string>;
  constructor(properties: DataStorage) {
    Object.assign(this, properties);
  }
}

export class ECPUPerSecond {
  Minimum?: Value<number>;
  Maximum?: Value<number>;
  constructor(properties: ECPUPerSecond) {
    Object.assign(this, properties);
  }
}

export class Endpoint {
  Address?: Value<string>;
  Port?: Value<string>;
  constructor(properties: Endpoint) {
    Object.assign(this, properties);
  }
}
export interface ServerlessCacheProperties {
  Description?: Value<string>;
  KmsKeyId?: Value<string>;
  FinalSnapshotName?: Value<string>;
  UserGroupId?: Value<string>;
  CacheUsageLimits?: CacheUsageLimits;
  SecurityGroupIds?: List<Value<string>>;
  SnapshotArnsToRestore?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  DailySnapshotTime?: Value<string>;
  ReaderEndpoint?: Endpoint;
  SnapshotRetentionLimit?: Value<number>;
  Endpoint?: Endpoint;
  ServerlessCacheName: Value<string>;
  MajorEngineVersion?: Value<string>;
  Engine: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ServerlessCache extends ResourceBase<ServerlessCacheProperties> {
  static CacheUsageLimits = CacheUsageLimits;
  static DataStorage = DataStorage;
  static ECPUPerSecond = ECPUPerSecond;
  static Endpoint = Endpoint;
  constructor(properties: ServerlessCacheProperties) {
    super('AWS::ElastiCache::ServerlessCache', properties);
  }
}
