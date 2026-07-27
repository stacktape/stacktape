import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EndpointDetails {
  Vpc?: Vpc;
  constructor(properties: EndpointDetails) {
    Object.assign(this, properties);
  }
}

export class IdentityProviderDetails {
  Role?: Value<string>;
  ApplicationArn?: Value<string>;
  InstanceArn?: Value<string>;
  constructor(properties: IdentityProviderDetails) {
    Object.assign(this, properties);
  }
}

export class Vpc {
  VpcId?: Value<string>;
  SubnetIds?: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: Vpc) {
    Object.assign(this, properties);
  }
}

export class WebAppCustomization {
  FaviconFile?: Value<string>;
  Title?: Value<string>;
  LogoFile?: Value<string>;
  constructor(properties: WebAppCustomization) {
    Object.assign(this, properties);
  }
}

export class WebAppUnits {
  Provisioned!: Value<number>;
  constructor(properties: WebAppUnits) {
    Object.assign(this, properties);
  }
}
export interface WebAppProperties {
  WebAppCustomization?: WebAppCustomization;
  IdentityProviderDetails: IdentityProviderDetails;
  WebAppUnits?: WebAppUnits;
  EndpointDetails?: EndpointDetails;
  WebAppEndpointPolicy?: Value<string>;
  Tags?: List<ResourceTag>;
  AccessEndpoint?: Value<string>;
}
export default class WebApp extends ResourceBase<WebAppProperties> {
  static EndpointDetails = EndpointDetails;
  static IdentityProviderDetails = IdentityProviderDetails;
  static Vpc = Vpc;
  static WebAppCustomization = WebAppCustomization;
  static WebAppUnits = WebAppUnits;
  constructor(properties: WebAppProperties) {
    super('AWS::Transfer::WebApp', properties);
  }
}
