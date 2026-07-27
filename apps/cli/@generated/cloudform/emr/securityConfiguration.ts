import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SecurityConfigurationProperties {
  SecurityConfiguration: { [key: string]: any };
  Name?: Value<string>;
}
export default class SecurityConfiguration extends ResourceBase<SecurityConfigurationProperties> {
  constructor(properties: SecurityConfigurationProperties) {
    super('AWS::EMR::SecurityConfiguration', properties);
  }
}
