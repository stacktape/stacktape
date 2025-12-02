import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapabilityConfiguration {
  Edi!: EdiConfiguration;
  constructor(properties: CapabilityConfiguration) {
    Object.assign(this, properties);
  }
}

export class EdiConfiguration {
  Type!: EdiType;
  InputLocation!: S3Location;
  TransformerId!: Value<string>;
  OutputLocation!: S3Location;
  CapabilityDirection?: Value<string>;
  constructor(properties: EdiConfiguration) {
    Object.assign(this, properties);
  }
}

export class EdiType {
  X12Details!: X12Details;
  constructor(properties: EdiType) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  BucketName?: Value<string>;
  Key?: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class X12Details {
  Version?: Value<string>;
  TransactionSet?: Value<string>;
  constructor(properties: X12Details) {
    Object.assign(this, properties);
  }
}
export interface CapabilityProperties {
  Type: Value<string>;
  Configuration: CapabilityConfiguration;
  InstructionsDocuments?: List<S3Location>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Capability extends ResourceBase<CapabilityProperties> {
  static CapabilityConfiguration = CapabilityConfiguration;
  static EdiConfiguration = EdiConfiguration;
  static EdiType = EdiType;
  static S3Location = S3Location;
  static X12Details = X12Details;
  constructor(properties: CapabilityProperties) {
    super('AWS::B2BI::Capability', properties);
  }
}
