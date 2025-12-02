import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface MailManagerAddonInstanceProperties {
  AddonSubscriptionId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class MailManagerAddonInstance extends ResourceBase<MailManagerAddonInstanceProperties> {
  constructor(properties: MailManagerAddonInstanceProperties) {
    super('AWS::SES::MailManagerAddonInstance', properties);
  }
}
