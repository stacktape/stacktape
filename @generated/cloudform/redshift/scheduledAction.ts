import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class PauseClusterMessage {
  ClusterIdentifier!: Value<string>;
  constructor(properties: PauseClusterMessage) {
    Object.assign(this, properties);
  }
}

export class ResizeClusterMessage {
  NodeType?: Value<string>;
  NumberOfNodes?: Value<number>;
  ClusterType?: Value<string>;
  Classic?: Value<boolean>;
  ClusterIdentifier!: Value<string>;
  constructor(properties: ResizeClusterMessage) {
    Object.assign(this, properties);
  }
}

export class ResumeClusterMessage {
  ClusterIdentifier!: Value<string>;
  constructor(properties: ResumeClusterMessage) {
    Object.assign(this, properties);
  }
}

export class ScheduledActionType {
  PauseCluster?: PauseClusterMessage;
  ResumeCluster?: ResumeClusterMessage;
  ResizeCluster?: ResizeClusterMessage;
  constructor(properties: ScheduledActionType) {
    Object.assign(this, properties);
  }
}
export interface ScheduledActionProperties {
  ScheduledActionDescription?: Value<string>;
  ScheduledActionName: Value<string>;
  EndTime?: Value<string>;
  Schedule?: Value<string>;
  IamRole?: Value<string>;
  StartTime?: Value<string>;
  Enable?: Value<boolean>;
  TargetAction?: ScheduledActionType;
}
export default class ScheduledAction extends ResourceBase<ScheduledActionProperties> {
  static PauseClusterMessage = PauseClusterMessage;
  static ResizeClusterMessage = ResizeClusterMessage;
  static ResumeClusterMessage = ResumeClusterMessage;
  static ScheduledActionType = ScheduledActionType;
  constructor(properties: ScheduledActionProperties) {
    super('AWS::Redshift::ScheduledAction', properties);
  }
}
