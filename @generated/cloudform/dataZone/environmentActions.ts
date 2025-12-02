import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AwsConsoleLinkParameters {
  Uri?: Value<string>;
  constructor(properties: AwsConsoleLinkParameters) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentActionsProperties {
  Description?: Value<string>;
  EnvironmentIdentifier?: Value<string>;
  Identifier?: Value<string>;
  Parameters?: AwsConsoleLinkParameters;
  DomainIdentifier?: Value<string>;
  Name: Value<string>;
}
export default class EnvironmentActions extends ResourceBase<EnvironmentActionsProperties> {
  static AwsConsoleLinkParameters = AwsConsoleLinkParameters;
  constructor(properties: EnvironmentActionsProperties) {
    super('AWS::DataZone::EnvironmentActions', properties);
  }
}
