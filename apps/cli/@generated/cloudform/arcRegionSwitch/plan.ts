import {ResourceBase, ResourceTag} from '../resource'
import { Value, List } from '../dataTypes'
export class ArcRoutingControlConfiguration {
    RegionAndRoutingControls!: {[key: string]: any}
    TimeoutMinutes?: Value<number>
    ExternalId?: Value<string>
    CrossAccountRole?: Value<string>
    constructor(properties: ArcRoutingControlConfiguration) {
        Object.assign(this, properties)
    }
}

export class Asg {
    ExternalId?: Value<string>
    CrossAccountRole?: Value<string>
    Arn?: Value<string>
    constructor(properties: Asg) {
        Object.assign(this, properties)
    }
}

export class AssociatedAlarm {
    ResourceIdentifier!: Value<string>
    ExternalId?: Value<string>
    AlarmType!: Value<string>
    CrossAccountRole?: Value<string>
    constructor(properties: AssociatedAlarm) {
        Object.assign(this, properties)
    }
}

export class CustomActionLambdaConfiguration {
    Lambdas!: List<Lambdas>
    RetryIntervalMinutes!: Value<number>
    TimeoutMinutes?: Value<number>
    RegionToRun!: Value<string>
    Ungraceful?: LambdaUngraceful
    constructor(properties: CustomActionLambdaConfiguration) {
        Object.assign(this, properties)
    }
}

export class DocumentDbConfiguration {
    DatabaseClusterArns!: List<Value<string>>
    TimeoutMinutes?: Value<number>
    ExternalId?: Value<string>
    Behavior!: {[key: string]: any}
    CrossAccountRole?: Value<string>
    Ungraceful?: DocumentDbUngraceful
    GlobalClusterIdentifier!: Value<string>
    constructor(properties: DocumentDbConfiguration) {
        Object.assign(this, properties)
    }
}

export class DocumentDbUngraceful {
    Ungraceful?: Value<string>
    constructor(properties: DocumentDbUngraceful) {
        Object.assign(this, properties)
    }
}

export class Ec2AsgCapacityIncreaseConfiguration {
    Asgs!: List<Asg>
    CapacityMonitoringApproach?: {[key: string]: any}
    TimeoutMinutes?: Value<number>
    Ungraceful?: Ec2Ungraceful
    TargetPercent?: Value<number>
    constructor(properties: Ec2AsgCapacityIncreaseConfiguration) {
        Object.assign(this, properties)
    }
}

export class Ec2Ungraceful {
    MinimumSuccessPercentage!: Value<number>
    constructor(properties: Ec2Ungraceful) {
        Object.assign(this, properties)
    }
}

export class EcsCapacityIncreaseConfiguration {
    Services!: List<Service>
    CapacityMonitoringApproach?: {[key: string]: any}
    TimeoutMinutes?: Value<number>
    Ungraceful?: EcsUngraceful
    TargetPercent?: Value<number>
    constructor(properties: EcsCapacityIncreaseConfiguration) {
        Object.assign(this, properties)
    }
}

export class EcsUngraceful {
    MinimumSuccessPercentage!: Value<number>
    constructor(properties: EcsUngraceful) {
        Object.assign(this, properties)
    }
}

export class EksCluster {
    ClusterArn!: Value<string>
    ExternalId?: Value<string>
    CrossAccountRole?: Value<string>
    constructor(properties: EksCluster) {
        Object.assign(this, properties)
    }
}

export class EksResourceScalingConfiguration {
    KubernetesResourceType!: KubernetesResourceType
    CapacityMonitoringApproach?: {[key: string]: any}
    EksClusters?: List<EksCluster>
    TimeoutMinutes?: Value<number>
    ScalingResources?: {[key: string]: any}
    Ungraceful?: EksResourceScalingUngraceful
    TargetPercent?: Value<number>
    constructor(properties: EksResourceScalingConfiguration) {
        Object.assign(this, properties)
    }
}

export class EksResourceScalingUngraceful {
    MinimumSuccessPercentage!: Value<number>
    constructor(properties: EksResourceScalingUngraceful) {
        Object.assign(this, properties)
    }
}

export class EventSourceMapping {
    ExternalId?: Value<string>
    Arn!: Value<string>
    CrossAccountRole?: Value<string>
    constructor(properties: EventSourceMapping) {
        Object.assign(this, properties)
    }
}

export class ExecutionApprovalConfiguration {
    TimeoutMinutes?: Value<number>
    ApprovalRole!: Value<string>
    constructor(properties: ExecutionApprovalConfiguration) {
        Object.assign(this, properties)
    }
}

export class ExecutionBlockConfiguration {
    RdsPromoteReadReplicaConfig?: RdsPromoteReadReplicaConfiguration
    ParallelConfig?: ParallelExecutionBlockConfiguration
    EcsCapacityIncreaseConfig?: EcsCapacityIncreaseConfiguration
    ExecutionApprovalConfig?: ExecutionApprovalConfiguration
    LambdaEventSourceMappingConfig?: LambdaEventSourceMappingConfiguration
    RegionSwitchPlanConfig?: RegionSwitchPlanConfiguration
    GlobalAuroraConfig?: GlobalAuroraConfiguration
    Route53HealthCheckConfig?: Route53HealthCheckConfiguration
    RdsCreateCrossRegionReadReplicaConfig?: RdsCreateCrossRegionReplicaConfiguration
    ArcRoutingControlConfig?: ArcRoutingControlConfiguration
    DocumentDbConfig?: DocumentDbConfiguration
    EksResourceScalingConfig?: EksResourceScalingConfiguration
    CustomActionLambdaConfig?: CustomActionLambdaConfiguration
    Ec2AsgCapacityIncreaseConfig?: Ec2AsgCapacityIncreaseConfiguration
    constructor(properties: ExecutionBlockConfiguration) {
        Object.assign(this, properties)
    }
}

export class GlobalAuroraConfiguration {
    DatabaseClusterArns!: List<Value<string>>
    TimeoutMinutes?: Value<number>
    ExternalId?: Value<string>
    Behavior!: {[key: string]: any}
    CrossAccountRole?: Value<string>
    Ungraceful?: GlobalAuroraUngraceful
    GlobalClusterIdentifier!: Value<string>
    constructor(properties: GlobalAuroraConfiguration) {
        Object.assign(this, properties)
    }
}

export class GlobalAuroraUngraceful {
    Ungraceful?: Value<string>
    constructor(properties: GlobalAuroraUngraceful) {
        Object.assign(this, properties)
    }
}

export class KubernetesResourceType {
    ApiVersion!: Value<string>
    Kind!: Value<string>
    constructor(properties: KubernetesResourceType) {
        Object.assign(this, properties)
    }
}

export class LambdaEventSourceMappingConfiguration {
    Action!: Value<string>
    TimeoutMinutes?: Value<number>
    RegionEventSourceMappings!: {[key: string]: EventSourceMapping}
    Ungraceful?: LambdaEventSourceMappingUngraceful
    constructor(properties: LambdaEventSourceMappingConfiguration) {
        Object.assign(this, properties)
    }
}

export class LambdaEventSourceMappingUngraceful {
    Behavior?: Value<string>
    constructor(properties: LambdaEventSourceMappingUngraceful) {
        Object.assign(this, properties)
    }
}

export class LambdaUngraceful {
    Behavior?: {[key: string]: any}
    constructor(properties: LambdaUngraceful) {
        Object.assign(this, properties)
    }
}

export class Lambdas {
    ExternalId?: Value<string>
    CrossAccountRole?: Value<string>
    Arn?: Value<string>
    constructor(properties: Lambdas) {
        Object.assign(this, properties)
    }
}

export class ParallelExecutionBlockConfiguration {
    Steps!: List<Step>
    constructor(properties: ParallelExecutionBlockConfiguration) {
        Object.assign(this, properties)
    }
}

export class RdsCreateCrossRegionReplicaConfiguration {
    DbInstanceArnMap!: {[key: string]: Value<string>}
    TimeoutMinutes?: Value<number>
    ExternalId?: Value<string>
    CrossAccountRole?: Value<string>
    constructor(properties: RdsCreateCrossRegionReplicaConfiguration) {
        Object.assign(this, properties)
    }
}

export class RdsPromoteReadReplicaConfiguration {
    DbInstanceArnMap!: {[key: string]: Value<string>}
    TimeoutMinutes?: Value<number>
    ExternalId?: Value<string>
    CrossAccountRole?: Value<string>
    constructor(properties: RdsPromoteReadReplicaConfiguration) {
        Object.assign(this, properties)
    }
}

export class RegionSwitchPlanConfiguration {
    ExternalId?: Value<string>
    CrossAccountRole?: Value<string>
    Arn!: Value<string>
    constructor(properties: RegionSwitchPlanConfiguration) {
        Object.assign(this, properties)
    }
}

export class ReportConfiguration {
    ReportOutput?: List<ReportOutputConfiguration>
    constructor(properties: ReportConfiguration) {
        Object.assign(this, properties)
    }
}

export class ReportOutputConfiguration {
    S3Configuration!: S3ReportOutputConfiguration
    constructor(properties: ReportOutputConfiguration) {
        Object.assign(this, properties)
    }
}

export class Route53HealthCheckConfiguration {
    RecordName!: Value<string>
    TimeoutMinutes?: Value<number>
    ExternalId?: Value<string>
    HostedZoneId!: Value<string>
    CrossAccountRole?: Value<string>
    RecordSets?: List<Route53ResourceRecordSet>
    constructor(properties: Route53HealthCheckConfiguration) {
        Object.assign(this, properties)
    }
}

export class Route53ResourceRecordSet {
    Region?: Value<string>
    RecordSetIdentifier?: Value<string>
    constructor(properties: Route53ResourceRecordSet) {
        Object.assign(this, properties)
    }
}

export class S3ReportOutputConfiguration {
    BucketPath?: Value<string>
    BucketOwner?: Value<string>
    constructor(properties: S3ReportOutputConfiguration) {
        Object.assign(this, properties)
    }
}

export class Service {
    ClusterArn?: Value<string>
    ExternalId?: Value<string>
    ServiceArn?: Value<string>
    CrossAccountRole?: Value<string>
    constructor(properties: Service) {
        Object.assign(this, properties)
    }
}

export class Step {
    ExecutionBlockConfiguration!: ExecutionBlockConfiguration
    Description?: Value<string>
    ExecutionBlockType!: Value<string>
    Name!: Value<string>
    constructor(properties: Step) {
        Object.assign(this, properties)
    }
}

export class Trigger {
    TargetRegion!: Value<string>
    Action!: Value<string>
    MinDelayMinutesBetweenExecutions!: Value<number>
    Description?: Value<string>
    Conditions!: List<TriggerCondition>
    constructor(properties: Trigger) {
        Object.assign(this, properties)
    }
}

export class TriggerCondition {
    Condition!: Value<string>
    AssociatedAlarmName!: Value<string>
    constructor(properties: TriggerCondition) {
        Object.assign(this, properties)
    }
}

export class Workflow {
    Steps?: List<Step>
    WorkflowTargetAction!: Value<string>
    WorkflowDescription?: Value<string>
    WorkflowTargetRegion?: Value<string>
    constructor(properties: Workflow) {
        Object.assign(this, properties)
    }
}
export interface PlanProperties {
    Description?: Value<string>
    PrimaryRegion?: Value<string>
    Workflows: List<Workflow>
    RecoveryTimeObjectiveMinutes?: Value<number>
    Regions: List<Value<string>>
    Triggers?: List<Trigger>
    AssociatedAlarms?: {[key: string]: AssociatedAlarm}
    RecoveryApproach: Value<string>
    ReportConfiguration?: ReportConfiguration
    ExecutionRole: Value<string>
    Tags?: {[key: string]: Value<string>}
    Name: Value<string>
}
export default class Plan extends ResourceBase<PlanProperties> {
    static ArcRoutingControlConfiguration = ArcRoutingControlConfiguration
    static Asg = Asg
    static AssociatedAlarm = AssociatedAlarm
    static CustomActionLambdaConfiguration = CustomActionLambdaConfiguration
    static DocumentDbConfiguration = DocumentDbConfiguration
    static DocumentDbUngraceful = DocumentDbUngraceful
    static Ec2AsgCapacityIncreaseConfiguration = Ec2AsgCapacityIncreaseConfiguration
    static Ec2Ungraceful = Ec2Ungraceful
    static EcsCapacityIncreaseConfiguration = EcsCapacityIncreaseConfiguration
    static EcsUngraceful = EcsUngraceful
    static EksCluster = EksCluster
    static EksResourceScalingConfiguration = EksResourceScalingConfiguration
    static EksResourceScalingUngraceful = EksResourceScalingUngraceful
    static EventSourceMapping = EventSourceMapping
    static ExecutionApprovalConfiguration = ExecutionApprovalConfiguration
    static ExecutionBlockConfiguration = ExecutionBlockConfiguration
    static GlobalAuroraConfiguration = GlobalAuroraConfiguration
    static GlobalAuroraUngraceful = GlobalAuroraUngraceful
    static KubernetesResourceType = KubernetesResourceType
    static LambdaEventSourceMappingConfiguration = LambdaEventSourceMappingConfiguration
    static LambdaEventSourceMappingUngraceful = LambdaEventSourceMappingUngraceful
    static LambdaUngraceful = LambdaUngraceful
    static Lambdas = Lambdas
    static ParallelExecutionBlockConfiguration = ParallelExecutionBlockConfiguration
    static RdsCreateCrossRegionReplicaConfiguration = RdsCreateCrossRegionReplicaConfiguration
    static RdsPromoteReadReplicaConfiguration = RdsPromoteReadReplicaConfiguration
    static RegionSwitchPlanConfiguration = RegionSwitchPlanConfiguration
    static ReportConfiguration = ReportConfiguration
    static ReportOutputConfiguration = ReportOutputConfiguration
    static Route53HealthCheckConfiguration = Route53HealthCheckConfiguration
    static Route53ResourceRecordSet = Route53ResourceRecordSet
    static S3ReportOutputConfiguration = S3ReportOutputConfiguration
    static Service = Service
    static Step = Step
    static Trigger = Trigger
    static TriggerCondition = TriggerCondition
    static Workflow = Workflow
    constructor(properties: PlanProperties) {
        super('AWS::ARCRegionSwitch::Plan', properties)
    }
}
