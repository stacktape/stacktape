import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MandatoryKeyword {
  Message!: Value<string>;
  constructor(properties: MandatoryKeyword) {
    Object.assign(this, properties);
  }
}

export class MandatoryKeywords {
  HELP!: MandatoryKeyword;
  STOP!: MandatoryKeyword;
  constructor(properties: MandatoryKeywords) {
    Object.assign(this, properties);
  }
}

export class OptionalKeyword {
  Action!: Value<string>;
  Keyword!: Value<string>;
  Message!: Value<string>;
  constructor(properties: OptionalKeyword) {
    Object.assign(this, properties);
  }
}

export class TwoWay {
  ChannelArn?: Value<string>;
  ChannelRole?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: TwoWay) {
    Object.assign(this, properties);
  }
}
export interface PoolProperties {
  OptOutListName?: Value<string>;
  SelfManagedOptOutsEnabled?: Value<boolean>;
  SharedRoutesEnabled?: Value<boolean>;
  OriginationIdentities: List<Value<string>>;
  TwoWay?: TwoWay;
  MandatoryKeywords: MandatoryKeywords;
  OptionalKeywords?: List<OptionalKeyword>;
  DeletionProtectionEnabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class Pool extends ResourceBase<PoolProperties> {
  static MandatoryKeyword = MandatoryKeyword;
  static MandatoryKeywords = MandatoryKeywords;
  static OptionalKeyword = OptionalKeyword;
  static TwoWay = TwoWay;
  constructor(properties: PoolProperties) {
    super('AWS::SMSVOICE::Pool', properties);
  }
}
