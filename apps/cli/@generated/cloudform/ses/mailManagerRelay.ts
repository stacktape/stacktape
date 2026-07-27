import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class RelayAuthentication {
  SecretArn?: Value<string>;
  NoAuthentication?: { [key: string]: any };
  constructor(properties: RelayAuthentication) {
    Object.assign(this, properties);
  }
}
export interface MailManagerRelayProperties {
  Authentication: RelayAuthentication;
  ServerName: Value<string>;
  RelayName?: Value<string>;
  ServerPort: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class MailManagerRelay extends ResourceBase<MailManagerRelayProperties> {
  static RelayAuthentication = RelayAuthentication;
  constructor(properties: MailManagerRelayProperties) {
    super('AWS::SES::MailManagerRelay', properties);
  }
}
