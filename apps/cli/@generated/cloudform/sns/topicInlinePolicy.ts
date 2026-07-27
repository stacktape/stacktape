import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TopicInlinePolicyProperties {
  TopicArn: Value<string>;
  PolicyDocument: { [key: string]: any };
}
export default class TopicInlinePolicy extends ResourceBase<TopicInlinePolicyProperties> {
  constructor(properties: TopicInlinePolicyProperties) {
    super('AWS::SNS::TopicInlinePolicy', properties);
  }
}
