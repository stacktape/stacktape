import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LogDeliveryConfiguration {
  S3Configuration!: S3Configuration;
  constructor(properties: LogDeliveryConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Configuration {
  BucketName!: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: S3Configuration) {
    Object.assign(this, properties);
  }
}
export interface InfluxDBClusterProperties {
  DbParameterGroupIdentifier?: Value<string>;
  Organization?: Value<string>;
  Port?: Value<number>;
  DbInstanceType?: Value<string>;
  VpcSubnetIds?: List<Value<string>>;
  FailoverMode?: Value<string>;
  DeploymentType?: Value<string>;
  Name?: Value<string>;
  AllocatedStorage?: Value<number>;
  DbStorageType?: Value<string>;
  LogDeliveryConfiguration?: LogDeliveryConfiguration;
  Username?: Value<string>;
  Bucket?: Value<string>;
  VpcSecurityGroupIds?: List<Value<string>>;
  NetworkType?: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  Tags?: List<ResourceTag>;
  Password?: Value<string>;
}
export default class InfluxDBCluster extends ResourceBase<InfluxDBClusterProperties> {
  static LogDeliveryConfiguration = LogDeliveryConfiguration;
  static S3Configuration = S3Configuration;
  constructor(properties?: InfluxDBClusterProperties) {
    super('AWS::Timestream::InfluxDBCluster', properties || {});
  }
}
