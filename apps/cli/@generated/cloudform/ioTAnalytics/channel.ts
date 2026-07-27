import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ChannelStorage {
  CustomerManagedS3?: CustomerManagedS3;
  ServiceManagedS3?: { [key: string]: any };
  constructor(properties: ChannelStorage) {
    Object.assign(this, properties);
  }
}

export class CustomerManagedS3 {
  Bucket!: Value<string>;
  RoleArn!: Value<string>;
  KeyPrefix?: Value<string>;
  constructor(properties: CustomerManagedS3) {
    Object.assign(this, properties);
  }
}

export class RetentionPeriod {
  NumberOfDays?: Value<number>;
  Unlimited?: Value<boolean>;
  constructor(properties: RetentionPeriod) {
    Object.assign(this, properties);
  }
}
export interface ChannelProperties {
  ChannelName?: Value<string>;
  ChannelStorage?: ChannelStorage;
  RetentionPeriod?: RetentionPeriod;
  Tags?: List<ResourceTag>;
}
export default class Channel extends ResourceBase<ChannelProperties> {
  static ChannelStorage = ChannelStorage;
  static CustomerManagedS3 = CustomerManagedS3;
  static RetentionPeriod = RetentionPeriod;
  constructor(properties?: ChannelProperties) {
    super('AWS::IoTAnalytics::Channel', properties || {});
  }
}
