import {ResourceBase, ResourceTag} from '../resource'
import { Value, List } from '../dataTypes'
export class AclConfiguration {
    S3AclOption!: Value<string>
    constructor(properties: AclConfiguration) {
        Object.assign(this, properties)
    }
}

export class Classification {
    Properties?: {[key: string]: Value<string>}
    Name?: Value<string>
    constructor(properties: Classification) {
        Object.assign(this, properties)
    }
}

export class CloudWatchLoggingConfiguration {
    LogGroup?: Value<string>
    Enabled?: Value<boolean>
    LogStreamNamePrefix?: Value<string>
    LogTypes?: {[key: string]: any}
    constructor(properties: CloudWatchLoggingConfiguration) {
        Object.assign(this, properties)
    }
}

export class CustomerContentEncryptionConfiguration {
    KmsKey!: Value<string>
    constructor(properties: CustomerContentEncryptionConfiguration) {
        Object.assign(this, properties)
    }
}

export class EncryptionConfiguration {
    EncryptionOption!: Value<string>
    KmsKey?: Value<string>
    constructor(properties: EncryptionConfiguration) {
        Object.assign(this, properties)
    }
}

export class EngineConfiguration {
    SparkProperties?: {[key: string]: Value<string>}
    Classifications?: List<Classification>
    MaxConcurrentDpus?: Value<number>
    CoordinatorDpuSize?: Value<number>
    DefaultExecutorDpuSize?: Value<number>
    AdditionalConfigs?: {[key: string]: Value<string>}
    constructor(properties: EngineConfiguration) {
        Object.assign(this, properties)
    }
}

export class EngineVersion {
    SelectedEngineVersion?: Value<string>
    EffectiveEngineVersion?: Value<string>
    constructor(properties: EngineVersion) {
        Object.assign(this, properties)
    }
}

export class ManagedLoggingConfiguration {
    Enabled?: Value<boolean>
    KmsKey?: Value<string>
    constructor(properties: ManagedLoggingConfiguration) {
        Object.assign(this, properties)
    }
}

export class ManagedQueryResultsConfiguration {
    EncryptionConfiguration?: ManagedStorageEncryptionConfiguration
    Enabled?: Value<boolean>
    constructor(properties: ManagedQueryResultsConfiguration) {
        Object.assign(this, properties)
    }
}

export class ManagedStorageEncryptionConfiguration {
    KmsKey?: Value<string>
    constructor(properties: ManagedStorageEncryptionConfiguration) {
        Object.assign(this, properties)
    }
}

export class MonitoringConfiguration {
    S3LoggingConfiguration?: S3LoggingConfiguration
    ManagedLoggingConfiguration?: ManagedLoggingConfiguration
    CloudWatchLoggingConfiguration?: CloudWatchLoggingConfiguration
    constructor(properties: MonitoringConfiguration) {
        Object.assign(this, properties)
    }
}

export class ResultConfiguration {
    EncryptionConfiguration?: EncryptionConfiguration
    OutputLocation?: Value<string>
    AclConfiguration?: AclConfiguration
    ExpectedBucketOwner?: Value<string>
    constructor(properties: ResultConfiguration) {
        Object.assign(this, properties)
    }
}

export class S3LoggingConfiguration {
    LogLocation?: Value<string>
    Enabled?: Value<boolean>
    KmsKey?: Value<string>
    constructor(properties: S3LoggingConfiguration) {
        Object.assign(this, properties)
    }
}

export class WorkGroupConfiguration {
    EnforceWorkGroupConfiguration?: Value<boolean>
    EngineVersion?: EngineVersion
    PublishCloudWatchMetricsEnabled?: Value<boolean>
    ResultConfiguration?: ResultConfiguration
    AdditionalConfiguration?: Value<string>
    EngineConfiguration?: EngineConfiguration
    CustomerContentEncryptionConfiguration?: CustomerContentEncryptionConfiguration
    BytesScannedCutoffPerQuery?: Value<number>
    MonitoringConfiguration?: MonitoringConfiguration
    RequesterPaysEnabled?: Value<boolean>
    ManagedQueryResultsConfiguration?: ManagedQueryResultsConfiguration
    ExecutionRole?: Value<string>
    constructor(properties: WorkGroupConfiguration) {
        Object.assign(this, properties)
    }
}
export interface WorkGroupProperties {
    RecursiveDeleteOption?: Value<boolean>
    WorkGroupConfiguration?: WorkGroupConfiguration
    Description?: Value<string>
    State?: Value<string>
    Tags?: List<ResourceTag>
    Name: Value<string>
}
export default class WorkGroup extends ResourceBase<WorkGroupProperties> {
    static AclConfiguration = AclConfiguration
    static Classification = Classification
    static CloudWatchLoggingConfiguration = CloudWatchLoggingConfiguration
    static CustomerContentEncryptionConfiguration = CustomerContentEncryptionConfiguration
    static EncryptionConfiguration = EncryptionConfiguration
    static EngineConfiguration = EngineConfiguration
    static EngineVersion = EngineVersion
    static ManagedLoggingConfiguration = ManagedLoggingConfiguration
    static ManagedQueryResultsConfiguration = ManagedQueryResultsConfiguration
    static ManagedStorageEncryptionConfiguration = ManagedStorageEncryptionConfiguration
    static MonitoringConfiguration = MonitoringConfiguration
    static ResultConfiguration = ResultConfiguration
    static S3LoggingConfiguration = S3LoggingConfiguration
    static WorkGroupConfiguration = WorkGroupConfiguration
    constructor(properties: WorkGroupProperties) {
        super('AWS::Athena::WorkGroup', properties)
    }
}
