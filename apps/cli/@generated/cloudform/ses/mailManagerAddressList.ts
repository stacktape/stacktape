import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface MailManagerAddressListProperties {
  AddressListName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class MailManagerAddressList extends ResourceBase<MailManagerAddressListProperties> {
  constructor(properties?: MailManagerAddressListProperties) {
    super('AWS::SES::MailManagerAddressList', properties || {});
  }
}
