import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourceSpec {
  LifecycleConfigArn?: Value<string>;
  SageMakerImageArn?: Value<string>;
  InstanceType?: Value<string>;
  SageMakerImageVersionArn?: Value<string>;
  constructor(properties: ResourceSpec) {
    Object.assign(this, properties);
  }
}
export interface AppProperties {
  RecoveryMode?: Value<boolean>;
  DomainId: Value<string>;
  ResourceSpec?: ResourceSpec;
  AppType: Value<string>;
  Tags?: List<ResourceTag>;
  UserProfileName: Value<string>;
  AppName: Value<string>;
}
export default class App extends ResourceBase<AppProperties> {
  static ResourceSpec = ResourceSpec;
  constructor(properties: AppProperties) {
    super('AWS::SageMaker::App', properties);
  }
}
