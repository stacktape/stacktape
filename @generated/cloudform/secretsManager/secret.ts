import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class GenerateSecretString {
  ExcludeUppercase?: Value<boolean>;
  RequireEachIncludedType?: Value<boolean>;
  IncludeSpace?: Value<boolean>;
  ExcludeCharacters?: Value<string>;
  GenerateStringKey?: Value<string>;
  PasswordLength?: Value<number>;
  ExcludePunctuation?: Value<boolean>;
  ExcludeLowercase?: Value<boolean>;
  SecretStringTemplate?: Value<string>;
  ExcludeNumbers?: Value<boolean>;
  constructor(properties: GenerateSecretString) {
    Object.assign(this, properties);
  }
}

export class ReplicaRegion {
  KmsKeyId?: Value<string>;
  Region!: Value<string>;
  constructor(properties: ReplicaRegion) {
    Object.assign(this, properties);
  }
}
export interface SecretProperties {
  Description?: Value<string>;
  KmsKeyId?: Value<string>;
  SecretString?: Value<string>;
  GenerateSecretString?: GenerateSecretString;
  ReplicaRegions?: List<ReplicaRegion>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Secret extends ResourceBase<SecretProperties> {
  static GenerateSecretString = GenerateSecretString;
  static ReplicaRegion = ReplicaRegion;
  constructor(properties?: SecretProperties) {
    super('AWS::SecretsManager::Secret', properties || {});
  }
}
