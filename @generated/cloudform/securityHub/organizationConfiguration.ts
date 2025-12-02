import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface OrganizationConfigurationProperties {
  AutoEnable: Value<boolean>;
  ConfigurationType?: Value<string>;
  AutoEnableStandards?: Value<string>;
}
export default class OrganizationConfiguration extends ResourceBase<OrganizationConfigurationProperties> {
  constructor(properties: OrganizationConfigurationProperties) {
    super('AWS::SecurityHub::OrganizationConfiguration', properties);
  }
}
