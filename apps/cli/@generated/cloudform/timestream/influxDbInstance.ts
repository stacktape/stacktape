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
export interface InfluxDBInstanceProperties {
  DbParameterGroupIdentifier?: Value<string>;
  Organization?: Value<string>;
  Port?: Value<number>;
  DbInstanceType?: Value<string>;
  VpcSubnetIds?: List<Value<string>>;
  DeploymentType?: Value<string>;
  AllocatedStorage?: Value<number>;
  Name?: Value<string>;
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
export default class InfluxDBInstance extends ResourceBase<InfluxDBInstanceProperties> {
  static LogDeliveryConfiguration = LogDeliveryConfiguration;
  static S3Configuration = S3Configuration;
  constructor(properties?: InfluxDBInstanceProperties) {
    super('AWS::Timestream::InfluxDBInstance', properties || {});
  }
}
