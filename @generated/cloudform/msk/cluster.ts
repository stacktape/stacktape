import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BrokerLogs {
  S3?: S3;
  Firehose?: Firehose;
  CloudWatchLogs?: CloudWatchLogs;
  constructor(properties: BrokerLogs) {
    Object.assign(this, properties);
  }
}

export class BrokerNodeGroupInfo {
  SecurityGroups?: List<Value<string>>;
  ClientSubnets!: List<Value<string>>;
  ConnectivityInfo?: ConnectivityInfo;
  StorageInfo?: StorageInfo;
  BrokerAZDistribution?: Value<string>;
  InstanceType!: Value<string>;
  constructor(properties: BrokerNodeGroupInfo) {
    Object.assign(this, properties);
  }
}

export class ClientAuthentication {
  Sasl?: Sasl;
  Unauthenticated?: Unauthenticated;
  Tls?: Tls;
  constructor(properties: ClientAuthentication) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLogs {
  LogGroup?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: CloudWatchLogs) {
    Object.assign(this, properties);
  }
}

export class ConfigurationInfo {
  Revision!: Value<number>;
  Arn!: Value<string>;
  constructor(properties: ConfigurationInfo) {
    Object.assign(this, properties);
  }
}

export class ConnectivityInfo {
  VpcConnectivity?: VpcConnectivity;
  PublicAccess?: PublicAccess;
  constructor(properties: ConnectivityInfo) {
    Object.assign(this, properties);
  }
}

export class EBSStorageInfo {
  ProvisionedThroughput?: ProvisionedThroughput;
  VolumeSize?: Value<number>;
  constructor(properties: EBSStorageInfo) {
    Object.assign(this, properties);
  }
}

export class EncryptionAtRest {
  DataVolumeKMSKeyId!: Value<string>;
  constructor(properties: EncryptionAtRest) {
    Object.assign(this, properties);
  }
}

export class EncryptionInTransit {
  ClientBroker?: Value<string>;
  InCluster?: Value<boolean>;
  constructor(properties: EncryptionInTransit) {
    Object.assign(this, properties);
  }
}

export class EncryptionInfo {
  EncryptionAtRest?: EncryptionAtRest;
  EncryptionInTransit?: EncryptionInTransit;
  constructor(properties: EncryptionInfo) {
    Object.assign(this, properties);
  }
}

export class Firehose {
  DeliveryStream?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: Firehose) {
    Object.assign(this, properties);
  }
}

export class Iam {
  Enabled!: Value<boolean>;
  constructor(properties: Iam) {
    Object.assign(this, properties);
  }
}

export class JmxExporter {
  EnabledInBroker!: Value<boolean>;
  constructor(properties: JmxExporter) {
    Object.assign(this, properties);
  }
}

export class LoggingInfo {
  BrokerLogs!: BrokerLogs;
  constructor(properties: LoggingInfo) {
    Object.assign(this, properties);
  }
}

export class NodeExporter {
  EnabledInBroker!: Value<boolean>;
  constructor(properties: NodeExporter) {
    Object.assign(this, properties);
  }
}

export class OpenMonitoring {
  Prometheus!: Prometheus;
  constructor(properties: OpenMonitoring) {
    Object.assign(this, properties);
  }
}

export class Prometheus {
  JmxExporter?: JmxExporter;
  NodeExporter?: NodeExporter;
  constructor(properties: Prometheus) {
    Object.assign(this, properties);
  }
}

export class ProvisionedThroughput {
  VolumeThroughput?: Value<number>;
  Enabled?: Value<boolean>;
  constructor(properties: ProvisionedThroughput) {
    Object.assign(this, properties);
  }
}

export class PublicAccess {
  Type?: Value<string>;
  constructor(properties: PublicAccess) {
    Object.assign(this, properties);
  }
}

export class S3 {
  Bucket?: Value<string>;
  Enabled!: Value<boolean>;
  Prefix?: Value<string>;
  constructor(properties: S3) {
    Object.assign(this, properties);
  }
}

export class Sasl {
  Iam?: Iam;
  Scram?: Scram;
  constructor(properties: Sasl) {
    Object.assign(this, properties);
  }
}

export class Scram {
  Enabled!: Value<boolean>;
  constructor(properties: Scram) {
    Object.assign(this, properties);
  }
}

export class StorageInfo {
  EBSStorageInfo?: EBSStorageInfo;
  constructor(properties: StorageInfo) {
    Object.assign(this, properties);
  }
}

export class Tls {
  Enabled?: Value<boolean>;
  CertificateAuthorityArnList?: List<Value<string>>;
  constructor(properties: Tls) {
    Object.assign(this, properties);
  }
}

export class Unauthenticated {
  Enabled!: Value<boolean>;
  constructor(properties: Unauthenticated) {
    Object.assign(this, properties);
  }
}

export class VpcConnectivity {
  ClientAuthentication?: VpcConnectivityClientAuthentication;
  constructor(properties: VpcConnectivity) {
    Object.assign(this, properties);
  }
}

export class VpcConnectivityClientAuthentication {
  Sasl?: VpcConnectivitySasl;
  Tls?: VpcConnectivityTls;
  constructor(properties: VpcConnectivityClientAuthentication) {
    Object.assign(this, properties);
  }
}

export class VpcConnectivityIam {
  Enabled!: Value<boolean>;
  constructor(properties: VpcConnectivityIam) {
    Object.assign(this, properties);
  }
}

export class VpcConnectivitySasl {
  Iam?: VpcConnectivityIam;
  Scram?: VpcConnectivityScram;
  constructor(properties: VpcConnectivitySasl) {
    Object.assign(this, properties);
  }
}

export class VpcConnectivityScram {
  Enabled!: Value<boolean>;
  constructor(properties: VpcConnectivityScram) {
    Object.assign(this, properties);
  }
}

export class VpcConnectivityTls {
  Enabled!: Value<boolean>;
  constructor(properties: VpcConnectivityTls) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  KafkaVersion: Value<string>;
  NumberOfBrokerNodes: Value<number>;
  EncryptionInfo?: EncryptionInfo;
  OpenMonitoring?: OpenMonitoring;
  CurrentVersion?: Value<string>;
  StorageMode?: Value<string>;
  ConfigurationInfo?: ConfigurationInfo;
  BrokerNodeGroupInfo: BrokerNodeGroupInfo;
  EnhancedMonitoring?: Value<string>;
  ClusterName: Value<string>;
  ClientAuthentication?: ClientAuthentication;
  LoggingInfo?: LoggingInfo;
  Tags?: { [key: string]: Value<string> };
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static BrokerLogs = BrokerLogs;
  static BrokerNodeGroupInfo = BrokerNodeGroupInfo;
  static ClientAuthentication = ClientAuthentication;
  static CloudWatchLogs = CloudWatchLogs;
  static ConfigurationInfo = ConfigurationInfo;
  static ConnectivityInfo = ConnectivityInfo;
  static EBSStorageInfo = EBSStorageInfo;
  static EncryptionAtRest = EncryptionAtRest;
  static EncryptionInTransit = EncryptionInTransit;
  static EncryptionInfo = EncryptionInfo;
  static Firehose = Firehose;
  static Iam = Iam;
  static JmxExporter = JmxExporter;
  static LoggingInfo = LoggingInfo;
  static NodeExporter = NodeExporter;
  static OpenMonitoring = OpenMonitoring;
  static Prometheus = Prometheus;
  static ProvisionedThroughput = ProvisionedThroughput;
  static PublicAccess = PublicAccess;
  static S3 = S3;
  static Sasl = Sasl;
  static Scram = Scram;
  static StorageInfo = StorageInfo;
  static Tls = Tls;
  static Unauthenticated = Unauthenticated;
  static VpcConnectivity = VpcConnectivity;
  static VpcConnectivityClientAuthentication = VpcConnectivityClientAuthentication;
  static VpcConnectivityIam = VpcConnectivityIam;
  static VpcConnectivitySasl = VpcConnectivitySasl;
  static VpcConnectivityScram = VpcConnectivityScram;
  static VpcConnectivityTls = VpcConnectivityTls;
  constructor(properties: ClusterProperties) {
    super('AWS::MSK::Cluster', properties);
  }
}
