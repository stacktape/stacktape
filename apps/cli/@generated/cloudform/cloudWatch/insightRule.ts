import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export type Tags = List<ResourceTag>;
export interface InsightRuleProperties {
  RuleState: Value<string>;
  RuleBody: Value<string>;
  ApplyOnTransformedLogs?: Value<boolean>;
  RuleName: Value<string>;
  Tags?: Tags;
}
export default class InsightRule extends ResourceBase<InsightRuleProperties> {
  constructor(properties: InsightRuleProperties) {
    super('AWS::CloudWatch::InsightRule', properties);
  }
}
