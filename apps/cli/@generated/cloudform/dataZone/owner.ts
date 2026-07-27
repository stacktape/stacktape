import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class OwnerGroupProperties {
  GroupIdentifier?: Value<string>;
  constructor(properties: OwnerGroupProperties) {
    Object.assign(this, properties);
  }
}

export class OwnerProperties {
  Group?: OwnerGroupProperties;
  User?: OwnerUserProperties;
  constructor(properties: OwnerProperties) {
    Object.assign(this, properties);
  }
}

export class OwnerUserProperties {
  UserIdentifier?: Value<string>;
  constructor(properties: OwnerUserProperties) {
    Object.assign(this, properties);
  }
}
export interface OwnerProperties {
  EntityType: Value<string>;
  Owner: OwnerProperties;
  EntityIdentifier: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class Owner extends ResourceBase<OwnerProperties> {
  static OwnerGroupProperties = OwnerGroupProperties;
  static OwnerProperties = OwnerProperties;
  static OwnerUserProperties = OwnerUserProperties;
  constructor(properties: OwnerProperties) {
    super('AWS::DataZone::Owner', properties);
  }
}
