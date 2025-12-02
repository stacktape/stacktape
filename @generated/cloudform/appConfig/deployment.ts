import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DynamicExtensionParameters {
  ParameterValue?: Value<string>;
  ExtensionReference?: Value<string>;
  ParameterName?: Value<string>;
  constructor(properties: DynamicExtensionParameters) {
    Object.assign(this, properties);
  }
}
export interface DeploymentProperties {
  DeploymentStrategyId: Value<string>;
  ConfigurationProfileId: Value<string>;
  EnvironmentId: Value<string>;
  KmsKeyIdentifier?: Value<string>;
  Description?: Value<string>;
  ConfigurationVersion: Value<string>;
  ApplicationId: Value<string>;
  DynamicExtensionParameters?: List<DynamicExtensionParameters>;
  Tags?: List<ResourceTag>;
}
export default class Deployment extends ResourceBase<DeploymentProperties> {
  static DynamicExtensionParameters = DynamicExtensionParameters;
  constructor(properties: DeploymentProperties) {
    super('AWS::AppConfig::Deployment', properties);
  }
}
