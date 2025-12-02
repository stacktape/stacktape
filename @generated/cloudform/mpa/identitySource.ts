import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IamIdentityCenter {
  ApprovalPortalUrl?: Value<string>;
  InstanceArn!: Value<string>;
  Region!: Value<string>;
  constructor(properties: IamIdentityCenter) {
    Object.assign(this, properties);
  }
}

export class IdentitySourceParameters {
  IamIdentityCenter!: IamIdentityCenter;
  constructor(properties: IdentitySourceParameters) {
    Object.assign(this, properties);
  }
}
export interface IdentitySourceProperties {
  IdentitySourceParameters: IdentitySourceParameters;
  Tags?: List<ResourceTag>;
}
export default class IdentitySource extends ResourceBase<IdentitySourceProperties> {
  static IamIdentityCenter = IamIdentityCenter;
  static IdentitySourceParameters = IdentitySourceParameters;
  constructor(properties: IdentitySourceProperties) {
    super('AWS::MPA::IdentitySource', properties);
  }
}
