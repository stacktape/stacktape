import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface SenderIdProperties {
  SenderId: Value<string>;
  DeletionProtectionEnabled?: Value<boolean>;
  IsoCountryCode: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class SenderId extends ResourceBase<SenderIdProperties> {
  constructor(properties: SenderIdProperties) {
    super('AWS::SMSVOICE::SenderId', properties);
  }
}
