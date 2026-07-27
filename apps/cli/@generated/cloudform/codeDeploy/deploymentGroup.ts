import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Alarm {
  Name?: Value<string>;
  constructor(properties: Alarm) {
    Object.assign(this, properties);
  }
}

export class AlarmConfiguration {
  IgnorePollAlarmFailure?: Value<boolean>;
  Alarms?: List<Alarm>;
  Enabled?: Value<boolean>;
  constructor(properties: AlarmConfiguration) {
    Object.assign(this, properties);
  }
}

export class AutoRollbackConfiguration {
  Events?: List<Value<string>>;
  Enabled?: Value<boolean>;
  constructor(properties: AutoRollbackConfiguration) {
    Object.assign(this, properties);
  }
}

export class BlueGreenDeploymentConfiguration {
  DeploymentReadyOption?: DeploymentReadyOption;
  TerminateBlueInstancesOnDeploymentSuccess?: BlueInstanceTerminationOption;
  GreenFleetProvisioningOption?: GreenFleetProvisioningOption;
  constructor(properties: BlueGreenDeploymentConfiguration) {
    Object.assign(this, properties);
  }
}

export class BlueInstanceTerminationOption {
  Action?: Value<string>;
  TerminationWaitTimeInMinutes?: Value<number>;
  constructor(properties: BlueInstanceTerminationOption) {
    Object.assign(this, properties);
  }
}

export class Deployment {
  Description?: Value<string>;
  Revision!: RevisionLocation;
  IgnoreApplicationStopFailures?: Value<boolean>;
  constructor(properties: Deployment) {
    Object.assign(this, properties);
  }
}

export class DeploymentReadyOption {
  WaitTimeInMinutes?: Value<number>;
  ActionOnTimeout?: Value<string>;
  constructor(properties: DeploymentReadyOption) {
    Object.assign(this, properties);
  }
}

export class DeploymentStyle {
  DeploymentType?: Value<string>;
  DeploymentOption?: Value<string>;
  constructor(properties: DeploymentStyle) {
    Object.assign(this, properties);
  }
}

export class EC2TagFilter {
  Value?: Value<string>;
  Type?: Value<string>;
  Key?: Value<string>;
  constructor(properties: EC2TagFilter) {
    Object.assign(this, properties);
  }
}

export class EC2TagSet {
  Ec2TagSetList?: List<EC2TagSetListObject>;
  constructor(properties: EC2TagSet) {
    Object.assign(this, properties);
  }
}

export class EC2TagSetListObject {
  Ec2TagGroup?: List<EC2TagFilter>;
  constructor(properties: EC2TagSetListObject) {
    Object.assign(this, properties);
  }
}

export class ECSService {
  ServiceName!: Value<string>;
  ClusterName!: Value<string>;
  constructor(properties: ECSService) {
    Object.assign(this, properties);
  }
}

export class ELBInfo {
  Name?: Value<string>;
  constructor(properties: ELBInfo) {
    Object.assign(this, properties);
  }
}

export class GitHubLocation {
  Repository!: Value<string>;
  CommitId!: Value<string>;
  constructor(properties: GitHubLocation) {
    Object.assign(this, properties);
  }
}

export class GreenFleetProvisioningOption {
  Action?: Value<string>;
  constructor(properties: GreenFleetProvisioningOption) {
    Object.assign(this, properties);
  }
}

export class LoadBalancerInfo {
  ElbInfoList?: List<ELBInfo>;
  TargetGroupInfoList?: List<TargetGroupInfo>;
  TargetGroupPairInfoList?: List<TargetGroupPairInfo>;
  constructor(properties: LoadBalancerInfo) {
    Object.assign(this, properties);
  }
}

export class OnPremisesTagSet {
  OnPremisesTagSetList?: List<OnPremisesTagSetListObject>;
  constructor(properties: OnPremisesTagSet) {
    Object.assign(this, properties);
  }
}

export class OnPremisesTagSetListObject {
  OnPremisesTagGroup?: List<TagFilter>;
  constructor(properties: OnPremisesTagSetListObject) {
    Object.assign(this, properties);
  }
}

export class RevisionLocation {
  GitHubLocation?: GitHubLocation;
  RevisionType?: Value<string>;
  S3Location?: S3Location;
  constructor(properties: RevisionLocation) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  BundleType?: Value<string>;
  Bucket!: Value<string>;
  ETag?: Value<string>;
  Version?: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class TagFilter {
  Value?: Value<string>;
  Type?: Value<string>;
  Key?: Value<string>;
  constructor(properties: TagFilter) {
    Object.assign(this, properties);
  }
}

export class TargetGroupInfo {
  Name?: Value<string>;
  constructor(properties: TargetGroupInfo) {
    Object.assign(this, properties);
  }
}

export class TargetGroupPairInfo {
  ProdTrafficRoute?: TrafficRoute;
  TestTrafficRoute?: TrafficRoute;
  TargetGroups?: List<TargetGroupInfo>;
  constructor(properties: TargetGroupPairInfo) {
    Object.assign(this, properties);
  }
}

export class TrafficRoute {
  ListenerArns?: List<Value<string>>;
  constructor(properties: TrafficRoute) {
    Object.assign(this, properties);
  }
}

export class TriggerConfig {
  TriggerName?: Value<string>;
  TriggerEvents?: List<Value<string>>;
  TriggerTargetArn?: Value<string>;
  constructor(properties: TriggerConfig) {
    Object.assign(this, properties);
  }
}
export interface DeploymentGroupProperties {
  OnPremisesTagSet?: OnPremisesTagSet;
  ApplicationName: Value<string>;
  DeploymentStyle?: DeploymentStyle;
  ServiceRoleArn: Value<string>;
  BlueGreenDeploymentConfiguration?: BlueGreenDeploymentConfiguration;
  AutoScalingGroups?: List<Value<string>>;
  Ec2TagSet?: EC2TagSet;
  OutdatedInstancesStrategy?: Value<string>;
  TriggerConfigurations?: List<TriggerConfig>;
  Deployment?: Deployment;
  DeploymentConfigName?: Value<string>;
  AlarmConfiguration?: AlarmConfiguration;
  Ec2TagFilters?: List<EC2TagFilter>;
  TerminationHookEnabled?: Value<boolean>;
  ECSServices?: List<ECSService>;
  AutoRollbackConfiguration?: AutoRollbackConfiguration;
  LoadBalancerInfo?: LoadBalancerInfo;
  DeploymentGroupName?: Value<string>;
  Tags?: List<ResourceTag>;
  OnPremisesInstanceTagFilters?: List<TagFilter>;
}
export default class DeploymentGroup extends ResourceBase<DeploymentGroupProperties> {
  static Alarm = Alarm;
  static AlarmConfiguration = AlarmConfiguration;
  static AutoRollbackConfiguration = AutoRollbackConfiguration;
  static BlueGreenDeploymentConfiguration = BlueGreenDeploymentConfiguration;
  static BlueInstanceTerminationOption = BlueInstanceTerminationOption;
  static Deployment = Deployment;
  static DeploymentReadyOption = DeploymentReadyOption;
  static DeploymentStyle = DeploymentStyle;
  static EC2TagFilter = EC2TagFilter;
  static EC2TagSet = EC2TagSet;
  static EC2TagSetListObject = EC2TagSetListObject;
  static ECSService = ECSService;
  static ELBInfo = ELBInfo;
  static GitHubLocation = GitHubLocation;
  static GreenFleetProvisioningOption = GreenFleetProvisioningOption;
  static LoadBalancerInfo = LoadBalancerInfo;
  static OnPremisesTagSet = OnPremisesTagSet;
  static OnPremisesTagSetListObject = OnPremisesTagSetListObject;
  static RevisionLocation = RevisionLocation;
  static S3Location = S3Location;
  static TagFilter = TagFilter;
  static TargetGroupInfo = TargetGroupInfo;
  static TargetGroupPairInfo = TargetGroupPairInfo;
  static TrafficRoute = TrafficRoute;
  static TriggerConfig = TriggerConfig;
  constructor(properties: DeploymentGroupProperties) {
    super('AWS::CodeDeploy::DeploymentGroup', properties);
  }
}
