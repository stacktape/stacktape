import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PullThroughCacheRuleProperties {
  UpstreamRegistryUrl?: Value<string>;
  CustomRoleArn?: Value<string>;
  UpstreamRepositoryPrefix?: Value<string>;
  UpstreamRegistry?: Value<string>;
  CredentialArn?: Value<string>;
  EcrRepositoryPrefix?: Value<string>;
}
export default class PullThroughCacheRule extends ResourceBase<PullThroughCacheRuleProperties> {
  constructor(properties?: PullThroughCacheRuleProperties) {
    super('AWS::ECR::PullThroughCacheRule', properties || {});
  }
}
