import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AssetType {
  Extension!: Value<string>;
  Bytes?: Value<string>;
  Category!: Value<string>;
  ResourceId?: Value<string>;
  ColorMode!: Value<string>;
  constructor(properties: AssetType) {
    Object.assign(this, properties);
  }
}
export interface ManagedLoginBrandingProperties {
  UserPoolId: Value<string>;
  UseCognitoProvidedValues?: Value<boolean>;
  Assets?: List<AssetType>;
  ClientId?: Value<string>;
  Settings?: { [key: string]: any };
  ReturnMergedResources?: Value<boolean>;
}
export default class ManagedLoginBranding extends ResourceBase<ManagedLoginBrandingProperties> {
  static AssetType = AssetType;
  constructor(properties: ManagedLoginBrandingProperties) {
    super('AWS::Cognito::ManagedLoginBranding', properties);
  }
}
