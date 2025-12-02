import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TargetAccountConfigurationProperties {
  AccountId: Value<string>;
  Description?: Value<string>;
  ExperimentTemplateId: Value<string>;
  RoleArn: Value<string>;
}
export default class TargetAccountConfiguration extends ResourceBase<TargetAccountConfigurationProperties> {
  constructor(properties: TargetAccountConfigurationProperties) {
    super('AWS::FIS::TargetAccountConfiguration', properties);
  }
}
