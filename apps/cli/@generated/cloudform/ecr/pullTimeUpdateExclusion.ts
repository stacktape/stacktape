import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PullTimeUpdateExclusionProperties {
  PrincipalArn: Value<string>;
}
export default class PullTimeUpdateExclusion extends ResourceBase<PullTimeUpdateExclusionProperties> {
  constructor(properties: PullTimeUpdateExclusionProperties) {
    super('AWS::ECR::PullTimeUpdateExclusion', properties);
  }
}
