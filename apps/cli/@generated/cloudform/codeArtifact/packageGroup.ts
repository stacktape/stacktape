import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class OriginConfiguration {
  Restrictions!: Restrictions;
  constructor(properties: OriginConfiguration) {
    Object.assign(this, properties);
  }
}

export class RestrictionType {
  Repositories?: List<Value<string>>;
  RestrictionMode!: Value<string>;
  constructor(properties: RestrictionType) {
    Object.assign(this, properties);
  }
}

export class Restrictions {
  ExternalUpstream?: RestrictionType;
  Publish?: RestrictionType;
  InternalUpstream?: RestrictionType;
  constructor(properties: Restrictions) {
    Object.assign(this, properties);
  }
}
export interface PackageGroupProperties {
  Pattern: Value<string>;
  Description?: Value<string>;
  DomainName: Value<string>;
  OriginConfiguration?: OriginConfiguration;
  ContactInfo?: Value<string>;
  DomainOwner?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class PackageGroup extends ResourceBase<PackageGroupProperties> {
  static OriginConfiguration = OriginConfiguration;
  static RestrictionType = RestrictionType;
  static Restrictions = Restrictions;
  constructor(properties: PackageGroupProperties) {
    super('AWS::CodeArtifact::PackageGroup', properties);
  }
}
