import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EventSubscription {
  EventType!: Value<string>;
  SnsTopicArn?: Value<string>;
  Name!: Value<string>;
  constructor(properties: EventSubscription) {
    Object.assign(this, properties);
  }
}

export class PermissionModel {
  Type!: Value<string>;
  CrossAccountRoleArns?: List<Value<string>>;
  InvokerRoleName?: Value<string>;
  constructor(properties: PermissionModel) {
    Object.assign(this, properties);
  }
}

export class PhysicalResourceId {
  Type!: Value<string>;
  Identifier!: Value<string>;
  AwsRegion?: Value<string>;
  AwsAccountId?: Value<string>;
  constructor(properties: PhysicalResourceId) {
    Object.assign(this, properties);
  }
}

export class ResourceMapping {
  MappingType!: Value<string>;
  LogicalStackName?: Value<string>;
  ResourceName?: Value<string>;
  TerraformSourceName?: Value<string>;
  PhysicalResourceId!: PhysicalResourceId;
  EksSourceName?: Value<string>;
  constructor(properties: ResourceMapping) {
    Object.assign(this, properties);
  }
}
export interface AppProperties {
  Description?: Value<string>;
  AppTemplateBody: Value<string>;
  AppAssessmentSchedule?: Value<string>;
  PermissionModel?: PermissionModel;
  ResourceMappings: List<ResourceMapping>;
  EventSubscriptions?: List<EventSubscription>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
  ResiliencyPolicyArn?: Value<string>;
}
export default class App extends ResourceBase<AppProperties> {
  static EventSubscription = EventSubscription;
  static PermissionModel = PermissionModel;
  static PhysicalResourceId = PhysicalResourceId;
  static ResourceMapping = ResourceMapping;
  constructor(properties: AppProperties) {
    super('AWS::ResilienceHub::App', properties);
  }
}
