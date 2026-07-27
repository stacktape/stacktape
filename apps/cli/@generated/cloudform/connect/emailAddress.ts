import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AliasConfiguration {
  EmailAddressArn!: Value<string>;
  constructor(properties: AliasConfiguration) {
    Object.assign(this, properties);
  }
}
export interface EmailAddressProperties {
  Description?: Value<string>;
  InstanceArn: Value<string>;
  DisplayName?: Value<string>;
  EmailAddress: Value<string>;
  Tags?: List<ResourceTag>;
  AliasConfigurations?: List<AliasConfiguration>;
}
export default class EmailAddress extends ResourceBase<EmailAddressProperties> {
  static AliasConfiguration = AliasConfiguration;
  constructor(properties: EmailAddressProperties) {
    super('AWS::Connect::EmailAddress', properties);
  }
}
