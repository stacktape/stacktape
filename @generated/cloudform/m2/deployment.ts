import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DeploymentProperties {
  EnvironmentId: Value<string>;
  ApplicationVersion: Value<number>;
  ApplicationId: Value<string>;
}
export default class Deployment extends ResourceBase<DeploymentProperties> {
  constructor(properties: DeploymentProperties) {
    super('AWS::M2::Deployment', properties);
  }
}
