import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AddressDimension {
  State?: ProfileDimension;
  Country?: ProfileDimension;
  PostalCode?: ProfileDimension;
  City?: ProfileDimension;
  County?: ProfileDimension;
  Province?: ProfileDimension;
  constructor(properties: AddressDimension) {
    Object.assign(this, properties);
  }
}

export class AttributeDimension {
  DimensionType!: Value<string>;
  Values!: List<Value<string>>;
  constructor(properties: AttributeDimension) {
    Object.assign(this, properties);
  }
}

export class CalculatedAttributeDimension {
  DimensionType!: Value<string>;
  Values!: List<Value<string>>;
  ConditionOverrides?: ConditionOverrides;
  constructor(properties: CalculatedAttributeDimension) {
    Object.assign(this, properties);
  }
}

export class ConditionOverrides {
  Range?: RangeOverride;
  constructor(properties: ConditionOverrides) {
    Object.assign(this, properties);
  }
}

export class DateDimension {
  DimensionType!: Value<string>;
  Values!: List<Value<string>>;
  constructor(properties: DateDimension) {
    Object.assign(this, properties);
  }
}

export class Dimension {
  CalculatedAttributes?: { [key: string]: CalculatedAttributeDimension };
  ProfileAttributes?: ProfileAttributes;
  constructor(properties: Dimension) {
    Object.assign(this, properties);
  }
}

export class ExtraLengthValueProfileDimension {
  DimensionType!: Value<string>;
  Values!: List<Value<string>>;
  constructor(properties: ExtraLengthValueProfileDimension) {
    Object.assign(this, properties);
  }
}

export class Group {
  Type?: Value<string>;
  SourceType?: Value<string>;
  Dimensions?: List<Dimension>;
  SourceSegments?: List<SourceSegment>;
  constructor(properties: Group) {
    Object.assign(this, properties);
  }
}

export class ProfileAttributes {
  AdditionalInformation?: ExtraLengthValueProfileDimension;
  ProfileType?: ProfileTypeDimension;
  BusinessName?: ProfileDimension;
  Address?: AddressDimension;
  FirstName?: ProfileDimension;
  PersonalEmailAddress?: ProfileDimension;
  BusinessEmailAddress?: ProfileDimension;
  Attributes?: { [key: string]: AttributeDimension };
  MailingAddress?: AddressDimension;
  BusinessPhoneNumber?: ProfileDimension;
  MiddleName?: ProfileDimension;
  MobilePhoneNumber?: ProfileDimension;
  EmailAddress?: ProfileDimension;
  AccountNumber?: ProfileDimension;
  BillingAddress?: AddressDimension;
  GenderString?: ProfileDimension;
  HomePhoneNumber?: ProfileDimension;
  ShippingAddress?: AddressDimension;
  PhoneNumber?: ProfileDimension;
  LastName?: ProfileDimension;
  PartyTypeString?: ProfileDimension;
  BirthDate?: DateDimension;
  constructor(properties: ProfileAttributes) {
    Object.assign(this, properties);
  }
}

export class ProfileDimension {
  DimensionType!: Value<string>;
  Values!: List<Value<string>>;
  constructor(properties: ProfileDimension) {
    Object.assign(this, properties);
  }
}

export class ProfileTypeDimension {
  DimensionType!: Value<string>;
  Values!: List<Value<string>>;
  constructor(properties: ProfileTypeDimension) {
    Object.assign(this, properties);
  }
}

export class RangeOverride {
  Start!: Value<number>;
  End?: Value<number>;
  Unit!: Value<string>;
  constructor(properties: RangeOverride) {
    Object.assign(this, properties);
  }
}

export class SegmentGroup {
  Groups?: List<Group>;
  Include?: Value<string>;
  constructor(properties: SegmentGroup) {
    Object.assign(this, properties);
  }
}

export class SourceSegment {
  SegmentDefinitionName?: Value<string>;
  constructor(properties: SourceSegment) {
    Object.assign(this, properties);
  }
}
export interface SegmentDefinitionProperties {
  Description?: Value<string>;
  DomainName: Value<string>;
  SegmentGroups: SegmentGroup;
  DisplayName: Value<string>;
  SegmentDefinitionName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class SegmentDefinition extends ResourceBase<SegmentDefinitionProperties> {
  static AddressDimension = AddressDimension;
  static AttributeDimension = AttributeDimension;
  static CalculatedAttributeDimension = CalculatedAttributeDimension;
  static ConditionOverrides = ConditionOverrides;
  static DateDimension = DateDimension;
  static Dimension = Dimension;
  static ExtraLengthValueProfileDimension = ExtraLengthValueProfileDimension;
  static Group = Group;
  static ProfileAttributes = ProfileAttributes;
  static ProfileDimension = ProfileDimension;
  static ProfileTypeDimension = ProfileTypeDimension;
  static RangeOverride = RangeOverride;
  static SegmentGroup = SegmentGroup;
  static SourceSegment = SourceSegment;
  constructor(properties: SegmentDefinitionProperties) {
    super('AWS::CustomerProfiles::SegmentDefinition', properties);
  }
}
