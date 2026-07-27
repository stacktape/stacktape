import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class InferenceProfileModel {
  ModelArn?: Value<string>;
  constructor(properties: InferenceProfileModel) {
    Object.assign(this, properties);
  }
}

export class InferenceProfileModelSource {
  CopyFrom!: Value<string>;
  constructor(properties: InferenceProfileModelSource) {
    Object.assign(this, properties);
  }
}
export interface ApplicationInferenceProfileProperties {
  Description?: Value<string>;
  InferenceProfileName: Value<string>;
  ModelSource?: InferenceProfileModelSource;
  Tags?: List<ResourceTag>;
}
export default class ApplicationInferenceProfile extends ResourceBase<ApplicationInferenceProfileProperties> {
  static InferenceProfileModel = InferenceProfileModel;
  static InferenceProfileModelSource = InferenceProfileModelSource;
  constructor(properties: ApplicationInferenceProfileProperties) {
    super('AWS::Bedrock::ApplicationInferenceProfile', properties);
  }
}
