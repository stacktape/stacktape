import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AssessmentTargetProperties {
  AssessmentTargetName?: Value<string>;
  ResourceGroupArn?: Value<string>;
}
export default class AssessmentTarget extends ResourceBase<AssessmentTargetProperties> {
  constructor(properties?: AssessmentTargetProperties) {
    super('AWS::Inspector::AssessmentTarget', properties || {});
  }
}
