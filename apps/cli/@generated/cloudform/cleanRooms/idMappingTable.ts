import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IdMappingTableInputReferenceConfig {
  InputReferenceArn!: Value<string>;
  ManageResourcePolicies!: Value<boolean>;
  constructor(properties: IdMappingTableInputReferenceConfig) {
    Object.assign(this, properties);
  }
}

export class IdMappingTableInputReferenceProperties {
  IdMappingTableInputSource!: List<IdMappingTableInputSource>;
  constructor(properties: IdMappingTableInputReferenceProperties) {
    Object.assign(this, properties);
  }
}

export class IdMappingTableInputSource {
  Type!: Value<string>;
  IdNamespaceAssociationId!: Value<string>;
  constructor(properties: IdMappingTableInputSource) {
    Object.assign(this, properties);
  }
}
export interface IdMappingTableProperties {
  MembershipIdentifier: Value<string>;
  Description?: Value<string>;
  KmsKeyArn?: Value<string>;
  InputReferenceConfig: IdMappingTableInputReferenceConfig;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class IdMappingTable extends ResourceBase<IdMappingTableProperties> {
  static IdMappingTableInputReferenceConfig = IdMappingTableInputReferenceConfig;
  static IdMappingTableInputReferenceProperties = IdMappingTableInputReferenceProperties;
  static IdMappingTableInputSource = IdMappingTableInputSource;
  constructor(properties: IdMappingTableProperties) {
    super('AWS::CleanRooms::IdMappingTable', properties);
  }
}
