import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface MailManagerAddonSubscriptionProperties {
  AddonName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class MailManagerAddonSubscription extends ResourceBase<MailManagerAddonSubscriptionProperties> {
  constructor(properties: MailManagerAddonSubscriptionProperties) {
    super('AWS::SES::MailManagerAddonSubscription', properties);
  }
}
