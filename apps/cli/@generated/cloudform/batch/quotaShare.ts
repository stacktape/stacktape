import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class QuotaShareCapacityLimit {
  CapacityUnit!: Value<string>;
  MaxCapacity!: Value<number>;
  constructor(properties: QuotaShareCapacityLimit) {
    Object.assign(this, properties);
  }
}

export class QuotaSharePreemptionConfiguration {
  InSharePreemption!: Value<string>;
  constructor(properties: QuotaSharePreemptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class QuotaShareResourceSharingConfiguration {
  BorrowLimit?: Value<number>;
  Strategy!: Value<string>;
  constructor(properties: QuotaShareResourceSharingConfiguration) {
    Object.assign(this, properties);
  }
}
export interface QuotaShareProperties {
  PreemptionConfiguration: QuotaSharePreemptionConfiguration;
  JobQueue: Value<string>;
  State?: Value<string>;
  ResourceSharingConfiguration: QuotaShareResourceSharingConfiguration;
  CapacityLimits: List<QuotaShareCapacityLimit>;
  Tags?: { [key: string]: Value<string> };
  QuotaShareName: Value<string>;
}
export default class QuotaShare extends ResourceBase<QuotaShareProperties> {
  static QuotaShareCapacityLimit = QuotaShareCapacityLimit;
  static QuotaSharePreemptionConfiguration = QuotaSharePreemptionConfiguration;
  static QuotaShareResourceSharingConfiguration = QuotaShareResourceSharingConfiguration;
  constructor(properties: QuotaShareProperties) {
    super('AWS::Batch::QuotaShare', properties);
  }
}
