import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ClientVpnAuthorizationRuleProperties {
  ClientVpnEndpointId: Value<string>;
  Description?: Value<string>;
  AccessGroupId?: Value<string>;
  TargetNetworkCidr: Value<string>;
  AuthorizeAllGroups?: Value<boolean>;
}
export default class ClientVpnAuthorizationRule extends ResourceBase<ClientVpnAuthorizationRuleProperties> {
  constructor(properties: ClientVpnAuthorizationRuleProperties) {
    super('AWS::EC2::ClientVpnAuthorizationRule', properties);
  }
}
