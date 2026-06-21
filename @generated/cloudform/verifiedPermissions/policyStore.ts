import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DeletionProtection {
  Mode!: Value<string>;
  constructor(properties: DeletionProtection) {
    Object.assign(this, properties);
  }
}

export class EncryptionSettings {
  KmsEncryptionSettings?: KmsEncryptionSettings;
  Default?: { [key: string]: any };
  constructor(properties: EncryptionSettings) {
    Object.assign(this, properties);
  }
}

export class EncryptionState {
  KmsEncryptionState?: KmsEncryptionState;
  Default?: { [key: string]: any };
  constructor(properties: EncryptionState) {
    Object.assign(this, properties);
  }
}

export class KmsEncryptionSettings {
  EncryptionContext?: { [key: string]: Value<string> };
  Key!: Value<string>;
  constructor(properties: KmsEncryptionSettings) {
    Object.assign(this, properties);
  }
}

export class KmsEncryptionState {
  EncryptionContext!: { [key: string]: Value<string> };
  Key!: Value<string>;
  constructor(properties: KmsEncryptionState) {
    Object.assign(this, properties);
  }
}

export class SchemaDefinition {
  CedarJson?: Value<string>;
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
  EncryptionSettings?: EncryptionSettings;
  Tags?: List<ResourceTag>;
}
export default class PolicyStore extends ResourceBase<PolicyStoreProperties> {
  static DeletionProtection = DeletionProtection;
  static EncryptionSettings = EncryptionSettings;
  static EncryptionState = EncryptionState;
  static KmsEncryptionSettings = KmsEncryptionSettings;
  static KmsEncryptionState = KmsEncryptionState;
  static SchemaDefinition = SchemaDefinition;
  static ValidationSettings = ValidationSettings;
  constructor(properties: PolicyStoreProperties) {
    super('AWS::VerifiedPermissions::PolicyStore', properties);
  }
}
