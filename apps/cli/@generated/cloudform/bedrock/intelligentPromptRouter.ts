import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PromptRouterTargetModel {
  ModelArn!: Value<string>;
  constructor(properties: PromptRouterTargetModel) {
    Object.assign(this, properties);
  }
}

export class RoutingCriteria {
  ResponseQualityDifference!: Value<number>;
  constructor(properties: RoutingCriteria) {
    Object.assign(this, properties);
  }
}
export interface IntelligentPromptRouterProperties {
  Description?: Value<string>;
  PromptRouterName: Value<string>;
  FallbackModel: PromptRouterTargetModel;
  RoutingCriteria: RoutingCriteria;
  Models: List<PromptRouterTargetModel>;
  Tags?: List<ResourceTag>;
}
export default class IntelligentPromptRouter extends ResourceBase<IntelligentPromptRouterProperties> {
  static PromptRouterTargetModel = PromptRouterTargetModel;
  static RoutingCriteria = RoutingCriteria;
  constructor(properties: IntelligentPromptRouterProperties) {
    super('AWS::Bedrock::IntelligentPromptRouter', properties);
  }
}
