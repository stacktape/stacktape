import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LaunchTemplateSpecification {
  Version?: Value<string>;
  Id?: Value<string>;
  Name?: Value<string>;
  constructor(properties: LaunchTemplateSpecification) {
    Object.assign(this, properties);
  }
}

export class NodeRepairConfig {
  Enabled?: Value<boolean>;
  NodeRepairConfigOverrides?: List<NodeRepairConfigOverrides>;
  MaxParallelNodesRepairedCount?: Value<number>;
  MaxUnhealthyNodeThresholdPercentage?: Value<number>;
  MaxParallelNodesRepairedPercentage?: Value<number>;
  MaxUnhealthyNodeThresholdCount?: Value<number>;
  constructor(properties: NodeRepairConfig) {
    Object.assign(this, properties);
  }
}

export class RemoteAccess {
  SourceSecurityGroups?: List<Value<string>>;
  Ec2SshKey!: Value<string>;
  constructor(properties: RemoteAccess) {
    Object.assign(this, properties);
  }
}

export class ScalingConfig {
  MinSize?: Value<number>;
  DesiredSize?: Value<number>;
  MaxSize?: Value<number>;
  constructor(properties: ScalingConfig) {
    Object.assign(this, properties);
  }
}

export class Taint {
  Value?: Value<string>;
  Effect?: Value<string>;
  Key?: Value<string>;
  constructor(properties: Taint) {
    Object.assign(this, properties);
  }
}

export class UpdateConfig {
  MaxUnavailablePercentage?: Value<number>;
  UpdateStrategy?: Value<string>;
  MaxUnavailable?: Value<number>;
  constructor(properties: UpdateConfig) {
    Object.assign(this, properties);
  }
}

export class NodeRepairConfigOverrides {
  NodeUnhealthyReason?: Value<string>;
  RepairAction?: Value<string>;
  MinRepairWaitTimeMins?: Value<number>;
  NodeMonitoringCondition?: Value<string>;
  constructor(properties: NodeRepairConfigOverrides) {
    Object.assign(this, properties);
  }
}
export interface NodegroupProperties {
  UpdateConfig?: UpdateConfig;
  ScalingConfig?: ScalingConfig;
  Labels?: { [key: string]: Value<string> };
  Taints?: List<Taint>;
  CapacityType?: Value<string>;
  ReleaseVersion?: Value<string>;
  NodeRepairConfig?: NodeRepairConfig;
  NodegroupName?: Value<string>;
  NodeRole: Value<string>;
  Subnets: List<Value<string>>;
  AmiType?: Value<string>;
  ForceUpdateEnabled?: Value<boolean>;
  Version?: Value<string>;
  LaunchTemplate?: LaunchTemplateSpecification;
  RemoteAccess?: RemoteAccess;
  DiskSize?: Value<number>;
  ClusterName: Value<string>;
  InstanceTypes?: List<Value<string>>;
  Tags?: { [key: string]: Value<string> };
}
export default class Nodegroup extends ResourceBase<NodegroupProperties> {
  static LaunchTemplateSpecification = LaunchTemplateSpecification;
  static NodeRepairConfig = NodeRepairConfig;
  static RemoteAccess = RemoteAccess;
  static ScalingConfig = ScalingConfig;
  static Taint = Taint;
  static UpdateConfig = UpdateConfig;
  static NodeRepairConfigOverrides = NodeRepairConfigOverrides;
  constructor(properties: NodegroupProperties) {
    super('AWS::EKS::Nodegroup', properties);
  }
}
