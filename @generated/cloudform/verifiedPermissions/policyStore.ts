import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DeletionProtection {
  Mode!: Value<string>;
  constructor(properties: DeletionProtection) {
    Object.assign(this, properties);
  }
}

export class SchemaDefinition {
  CedarJson?: Value<string>;
  CedarFormat?: Value<string>;
  constructor(properties: SchemaDefinition) {
    Object.assign(this, properties);
  }
}

export class ValidationSettings {
  Mode!: Value<string>;
  constructor(properties: ValidationSettings) {
    Object.assign(this, properties);
  }
}
export interface PolicyStoreProperties {
  Description?: Value<string>;
  ValidationSettings: ValidationSettings;
  Schema?: SchemaDefinition;
  DeletionProtection?: DeletionProtection;
  Tags?: List<ResourceTag>;
}
export default class PolicyStore extends ResourceBase<PolicyStoreProperties> {
  static DeletionProtection = DeletionProtection;
  static SchemaDefinition = SchemaDefinition;
  static ValidationSettings = ValidationSettings;
  constructor(properties: PolicyStoreProperties) {
    super('AWS::VerifiedPermissions::PolicyStore', properties);
  }
}
