import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AllowedPublishers {
  SigningProfileVersionArns!: List<Value<string>>;
  constructor(properties: AllowedPublishers) {
    Object.assign(this, properties);
  }
}

export class CodeSigningPolicies {
  UntrustedArtifactOnDeployment!: Value<string>;
  constructor(properties: CodeSigningPolicies) {
    Object.assign(this, properties);
  }
}
export interface CodeSigningConfigProperties {
  Description?: Value<string>;
  AllowedPublishers: AllowedPublishers;
  CodeSigningPolicies?: CodeSigningPolicies;
  Tags?: List<ResourceTag>;
}
export default class CodeSigningConfig extends ResourceBase<CodeSigningConfigProperties> {
  static AllowedPublishers = AllowedPublishers;
  static CodeSigningPolicies = CodeSigningPolicies;
  constructor(properties: CodeSigningConfigProperties) {
    super('AWS::Lambda::CodeSigningConfig', properties);
  }
}
