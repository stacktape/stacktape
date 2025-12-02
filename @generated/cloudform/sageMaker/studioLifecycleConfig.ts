import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface StudioLifecycleConfigProperties {
  StudioLifecycleConfigAppType: Value<string>;
  StudioLifecycleConfigName: Value<string>;
  StudioLifecycleConfigContent: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class StudioLifecycleConfig extends ResourceBase<StudioLifecycleConfigProperties> {
  constructor(properties: StudioLifecycleConfigProperties) {
    super('AWS::SageMaker::StudioLifecycleConfig', properties);
  }
}
