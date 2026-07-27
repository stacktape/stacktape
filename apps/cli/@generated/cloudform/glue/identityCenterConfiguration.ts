import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface IdentityCenterConfigurationProperties {
  UserBackgroundSessionsEnabled?: Value<boolean>;
  Scopes?: List<Value<string>>;
  InstanceArn: Value<string>;
}
export default class IdentityCenterConfiguration extends ResourceBase<IdentityCenterConfigurationProperties> {
  constructor(properties: IdentityCenterConfigurationProperties) {
    super('AWS::Glue::IdentityCenterConfiguration', properties);
  }
}
