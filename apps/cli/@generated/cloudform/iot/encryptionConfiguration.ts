import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigurationDetails {
  ConfigurationStatus?: Value<string>;
  ErrorCode?: Value<string>;
  ErrorMessage?: Value<string>;
  constructor(properties: ConfigurationDetails) {
    Object.assign(this, properties);
  }
}
export interface EncryptionConfigurationProperties {
  EncryptionType: Value<string>;
  KmsKeyArn?: Value<string>;
  KmsAccessRoleArn?: Value<string>;
}
export default class EncryptionConfiguration extends ResourceBase<EncryptionConfigurationProperties> {
  static ConfigurationDetails = ConfigurationDetails;
  constructor(properties: EncryptionConfigurationProperties) {
    super('AWS::IoT::EncryptionConfiguration', properties);
  }
}
