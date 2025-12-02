import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DeploymentStrategyProperties {
  ReplicateTo: Value<string>;
  GrowthType?: Value<string>;
  Description?: Value<string>;
  DeploymentDurationInMinutes: Value<number>;
  GrowthFactor: Value<number>;
  FinalBakeTimeInMinutes?: Value<number>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class DeploymentStrategy extends ResourceBase<DeploymentStrategyProperties> {
  constructor(properties: DeploymentStrategyProperties) {
    super('AWS::AppConfig::DeploymentStrategy', properties);
  }
}
