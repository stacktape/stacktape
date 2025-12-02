import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributeMapItems {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: AttributeMapItems) {
    Object.assign(this, properties);
  }
}

export class FederationParameters {
  AttributeMap?: List<AttributeMapItems>;
  FederationProviderName?: Value<string>;
  SamlMetadataURL?: Value<string>;
  FederationURN?: Value<string>;
  SamlMetadataDocument?: Value<string>;
  ApplicationCallBackURL?: Value<string>;
  constructor(properties: FederationParameters) {
    Object.assign(this, properties);
  }
}

export class SuperuserParameters {
  FirstName?: Value<string>;
  LastName?: Value<string>;
  EmailAddress?: Value<string>;
  constructor(properties: SuperuserParameters) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentProperties {
  Description?: Value<string>;
  KmsKeyId?: Value<string>;
  FederationParameters?: FederationParameters;
  FederationMode?: Value<string>;
  SuperuserParameters?: SuperuserParameters;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Environment extends ResourceBase<EnvironmentProperties> {
  static AttributeMapItems = AttributeMapItems;
  static FederationParameters = FederationParameters;
  static SuperuserParameters = SuperuserParameters;
  constructor(properties: EnvironmentProperties) {
    super('AWS::FinSpace::Environment', properties);
  }
}
