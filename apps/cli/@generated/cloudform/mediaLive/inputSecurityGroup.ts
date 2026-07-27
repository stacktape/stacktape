import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class InputWhitelistRuleCidr {
  Cidr?: Value<string>;
  constructor(properties: InputWhitelistRuleCidr) {
    Object.assign(this, properties);
  }
}
export interface InputSecurityGroupProperties {
  WhitelistRules?: List<InputWhitelistRuleCidr>;
  Tags?: { [key: string]: any };
}
export default class InputSecurityGroup extends ResourceBase<InputSecurityGroupProperties> {
  static InputWhitelistRuleCidr = InputWhitelistRuleCidr;
  constructor(properties?: InputSecurityGroupProperties) {
    super('AWS::MediaLive::InputSecurityGroup', properties || {});
  }
}
