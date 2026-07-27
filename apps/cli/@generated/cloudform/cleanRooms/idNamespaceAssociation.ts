import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IdMappingConfig {
  AllowUseAsDimensionColumn!: Value<boolean>;
  constructor(properties: IdMappingConfig) {
    Object.assign(this, properties);
  }
}

export class IdNamespaceAssociationInputReferenceConfig {
  InputReferenceArn!: Value<string>;
  ManageResourcePolicies!: Value<boolean>;
  constructor(properties: IdNamespaceAssociationInputReferenceConfig) {
    Object.assign(this, properties);
  }
}

export class IdNamespaceAssociationInputReferenceProperties {
  IdNamespaceType?: Value<string>;
  IdMappingWorkflowsSupported?: List<{ [key: string]: any }>;
  constructor(properties: IdNamespaceAssociationInputReferenceProperties) {
    Object.assign(this, properties);
  }
}
export interface IdNamespaceAssociationProperties {
  IdMappingConfig?: IdMappingConfig;
  MembershipIdentifier: Value<string>;
  Description?: Value<string>;
  InputReferenceConfig: IdNamespaceAssociationInputReferenceConfig;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class IdNamespaceAssociation extends ResourceBase<IdNamespaceAssociationProperties> {
  static IdMappingConfig = IdMappingConfig;
  static IdNamespaceAssociationInputReferenceConfig = IdNamespaceAssociationInputReferenceConfig;
  static IdNamespaceAssociationInputReferenceProperties = IdNamespaceAssociationInputReferenceProperties;
  constructor(properties: IdNamespaceAssociationProperties) {
    super('AWS::CleanRooms::IdNamespaceAssociation', properties);
  }
}
