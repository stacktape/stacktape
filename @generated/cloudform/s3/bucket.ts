import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AbortIncompleteMultipartUpload {
  DaysAfterInitiation!: Value<number>;
  constructor(properties: AbortIncompleteMultipartUpload) {
    Object.assign(this, properties);
  }
}

export class AccelerateConfiguration {
  AccelerationStatus!: Value<string>;
  constructor(properties: AccelerateConfiguration) {
    Object.assign(this, properties);
  }
}

export class AccessControlTranslation {
  Owner!: Value<string>;
  constructor(properties: AccessControlTranslation) {
    Object.assign(this, properties);
  }
}

export class AnalyticsConfiguration {
  StorageClassAnalysis!: StorageClassAnalysis;
  TagFilters?: List<TagFilter>;
  Id!: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: AnalyticsConfiguration) {
    Object.assign(this, properties);
  }
}

export class BucketEncryption {
  ServerSideEncryptionConfiguration!: List<ServerSideEncryptionRule>;
  constructor(properties: BucketEncryption) {
    Object.assign(this, properties);
  }
}

export class CorsConfiguration {
  CorsRules!: List<CorsRule>;
  constructor(properties: CorsConfiguration) {
    Object.assign(this, properties);
  }
}

export class CorsRule {
  ExposedHeaders?: List<Value<string>>;
  AllowedMethods!: List<Value<string>>;
  AllowedOrigins!: List<Value<string>>;
  AllowedHeaders?: List<Value<string>>;
  MaxAge?: Value<number>;
  Id?: Value<string>;
  constructor(properties: CorsRule) {
    Object.assign(this, properties);
  }
}

export class DataExport {
  Destination!: Destination;
  OutputSchemaVersion!: Value<string>;
  constructor(properties: DataExport) {
    Object.assign(this, properties);
  }
}

export class DefaultRetention {
  Years?: Value<number>;
  Days?: Value<number>;
  Mode?: Value<string>;
  constructor(properties: DefaultRetention) {
    Object.assign(this, properties);
  }
}

export class DeleteMarkerReplication {
  Status?: Value<string>;
  constructor(properties: DeleteMarkerReplication) {
    Object.assign(this, properties);
  }
}

export class Destination {
  BucketArn!: Value<string>;
  Format!: Value<string>;
  BucketAccountId?: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: Destination) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfiguration {
  ReplicaKmsKeyID!: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class EventBridgeConfiguration {
  EventBridgeEnabled!: Value<boolean>;
  constructor(properties: EventBridgeConfiguration) {
    Object.assign(this, properties);
  }
}

export class FilterRule {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: FilterRule) {
    Object.assign(this, properties);
  }
}

export class IntelligentTieringConfiguration {
  Status!: Value<string>;
  Tierings!: List<Tiering>;
  TagFilters?: List<TagFilter>;
  Id!: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: IntelligentTieringConfiguration) {
    Object.assign(this, properties);
  }
}

export class InventoryConfiguration {
  Destination!: Destination;
  OptionalFields?: List<Value<string>>;
  IncludedObjectVersions!: Value<string>;
  Enabled!: Value<boolean>;
  Id!: Value<string>;
  Prefix?: Value<string>;
  ScheduleFrequency!: Value<string>;
  constructor(properties: InventoryConfiguration) {
    Object.assign(this, properties);
  }
}

export class InventoryTableConfiguration {
  TableName?: Value<string>;
  ConfigurationState!: Value<string>;
  TableArn?: Value<string>;
  EncryptionConfiguration?: MetadataTableEncryptionConfiguration;
  constructor(properties: InventoryTableConfiguration) {
    Object.assign(this, properties);
  }
}

export class JournalTableConfiguration {
  TableName?: Value<string>;
  TableArn?: Value<string>;
  EncryptionConfiguration?: MetadataTableEncryptionConfiguration;
  RecordExpiration!: RecordExpiration;
  constructor(properties: JournalTableConfiguration) {
    Object.assign(this, properties);
  }
}

export class LambdaConfiguration {
  Function!: Value<string>;
  Filter?: NotificationFilter;
  Event!: Value<string>;
  constructor(properties: LambdaConfiguration) {
    Object.assign(this, properties);
  }
}

export class LifecycleConfiguration {
  TransitionDefaultMinimumObjectSize?: Value<string>;
  Rules!: List<Rule>;
  constructor(properties: LifecycleConfiguration) {
    Object.assign(this, properties);
  }
}

export class LoggingConfiguration {
  TargetObjectKeyFormat?: TargetObjectKeyFormat;
  LogFilePrefix?: Value<string>;
  DestinationBucketName?: Value<string>;
  constructor(properties: LoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetadataConfiguration {
  Destination?: MetadataDestination;
  JournalTableConfiguration!: JournalTableConfiguration;
  InventoryTableConfiguration?: InventoryTableConfiguration;
  constructor(properties: MetadataConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetadataDestination {
  TableBucketArn?: Value<string>;
  TableBucketType!: Value<string>;
  TableNamespace?: Value<string>;
  constructor(properties: MetadataDestination) {
    Object.assign(this, properties);
  }
}

export class MetadataTableConfiguration {
  S3TablesDestination!: S3TablesDestination;
  constructor(properties: MetadataTableConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetadataTableEncryptionConfiguration {
  KmsKeyArn?: Value<string>;
  SseAlgorithm!: Value<string>;
  constructor(properties: MetadataTableEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class Metrics {
  Status!: Value<string>;
  EventThreshold?: ReplicationTimeValue;
  constructor(properties: Metrics) {
    Object.assign(this, properties);
  }
}

export class MetricsConfiguration {
  AccessPointArn?: Value<string>;
  TagFilters?: List<TagFilter>;
  Id!: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: MetricsConfiguration) {
    Object.assign(this, properties);
  }
}

export class NoncurrentVersionExpiration {
  NoncurrentDays!: Value<number>;
  NewerNoncurrentVersions?: Value<number>;
  constructor(properties: NoncurrentVersionExpiration) {
    Object.assign(this, properties);
  }
}

export class NoncurrentVersionTransition {
  StorageClass!: Value<string>;
  TransitionInDays!: Value<number>;
  NewerNoncurrentVersions?: Value<number>;
  constructor(properties: NoncurrentVersionTransition) {
    Object.assign(this, properties);
  }
}

export class NotificationConfiguration {
  TopicConfigurations?: List<TopicConfiguration>;
  QueueConfigurations?: List<QueueConfiguration>;
  LambdaConfigurations?: List<LambdaConfiguration>;
  EventBridgeConfiguration?: EventBridgeConfiguration;
  constructor(properties: NotificationConfiguration) {
    Object.assign(this, properties);
  }
}

export class NotificationFilter {
  S3Key!: S3KeyFilter;
  constructor(properties: NotificationFilter) {
    Object.assign(this, properties);
  }
}

export class ObjectLockConfiguration {
  ObjectLockEnabled?: Value<string>;
  Rule?: ObjectLockRule;
  constructor(properties: ObjectLockConfiguration) {
    Object.assign(this, properties);
  }
}

export class ObjectLockRule {
  DefaultRetention?: DefaultRetention;
  constructor(properties: ObjectLockRule) {
    Object.assign(this, properties);
  }
}

export class OwnershipControls {
  Rules!: List<OwnershipControlsRule>;
  constructor(properties: OwnershipControls) {
    Object.assign(this, properties);
  }
}

export class OwnershipControlsRule {
  ObjectOwnership?: Value<string>;
  constructor(properties: OwnershipControlsRule) {
    Object.assign(this, properties);
  }
}

export class PartitionedPrefix {
  PartitionDateSource?: Value<string>;
  constructor(properties: PartitionedPrefix) {
    Object.assign(this, properties);
  }
}

export class PublicAccessBlockConfiguration {
  RestrictPublicBuckets?: Value<boolean>;
  BlockPublicPolicy?: Value<boolean>;
  BlockPublicAcls?: Value<boolean>;
  IgnorePublicAcls?: Value<boolean>;
  constructor(properties: PublicAccessBlockConfiguration) {
    Object.assign(this, properties);
  }
}

export class QueueConfiguration {
  Filter?: NotificationFilter;
  Event!: Value<string>;
  Queue!: Value<string>;
  constructor(properties: QueueConfiguration) {
    Object.assign(this, properties);
  }
}

export class RecordExpiration {
  Days?: Value<number>;
  Expiration!: Value<string>;
  constructor(properties: RecordExpiration) {
    Object.assign(this, properties);
  }
}

export class RedirectAllRequestsTo {
  Protocol?: Value<string>;
  HostName!: Value<string>;
  constructor(properties: RedirectAllRequestsTo) {
    Object.assign(this, properties);
  }
}

export class RedirectRule {
  ReplaceKeyWith?: Value<string>;
  HttpRedirectCode?: Value<string>;
  Protocol?: Value<string>;
  HostName?: Value<string>;
  ReplaceKeyPrefixWith?: Value<string>;
  constructor(properties: RedirectRule) {
    Object.assign(this, properties);
  }
}

export class ReplicaModifications {
  Status!: Value<string>;
  constructor(properties: ReplicaModifications) {
    Object.assign(this, properties);
  }
}

export class ReplicationConfiguration {
  Role!: Value<string>;
  Rules!: List<ReplicationRule>;
  constructor(properties: ReplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReplicationDestination {
  AccessControlTranslation?: AccessControlTranslation;
  Account?: Value<string>;
  Metrics?: Metrics;
  Bucket!: Value<string>;
  EncryptionConfiguration?: EncryptionConfiguration;
  StorageClass?: Value<string>;
  ReplicationTime?: ReplicationTime;
  constructor(properties: ReplicationDestination) {
    Object.assign(this, properties);
  }
}

export class ReplicationRule {
  Status!: Value<string>;
  Destination!: ReplicationDestination;
  Filter?: ReplicationRuleFilter;
  Priority?: Value<number>;
  SourceSelectionCriteria?: SourceSelectionCriteria;
  Id?: Value<string>;
  Prefix?: Value<string>;
  DeleteMarkerReplication?: DeleteMarkerReplication;
  constructor(properties: ReplicationRule) {
    Object.assign(this, properties);
  }
}

export class ReplicationRuleAndOperator {
  TagFilters?: List<TagFilter>;
  Prefix?: Value<string>;
  constructor(properties: ReplicationRuleAndOperator) {
    Object.assign(this, properties);
  }
}

export class ReplicationRuleFilter {
  And?: ReplicationRuleAndOperator;
  TagFilter?: TagFilter;
  Prefix?: Value<string>;
  constructor(properties: ReplicationRuleFilter) {
    Object.assign(this, properties);
  }
}

export class ReplicationTime {
  Status!: Value<string>;
  Time!: ReplicationTimeValue;
  constructor(properties: ReplicationTime) {
    Object.assign(this, properties);
  }
}

export class ReplicationTimeValue {
  Minutes!: Value<number>;
  constructor(properties: ReplicationTimeValue) {
    Object.assign(this, properties);
  }
}

export class RoutingRule {
  RedirectRule!: RedirectRule;
  RoutingRuleCondition?: RoutingRuleCondition;
  constructor(properties: RoutingRule) {
    Object.assign(this, properties);
  }
}

export class RoutingRuleCondition {
  KeyPrefixEquals?: Value<string>;
  HttpErrorCodeReturnedEquals?: Value<string>;
  constructor(properties: RoutingRuleCondition) {
    Object.assign(this, properties);
  }
}

export class Rule {
  Status!: Value<string>;
  ExpiredObjectDeleteMarker?: Value<boolean>;
  NoncurrentVersionExpirationInDays?: Value<number>;
  Transitions?: List<Transition>;
  ObjectSizeGreaterThan?: Value<string>;
  TagFilters?: List<TagFilter>;
  NoncurrentVersionTransitions?: List<NoncurrentVersionTransition>;
  Prefix?: Value<string>;
  ObjectSizeLessThan?: Value<string>;
  NoncurrentVersionTransition?: NoncurrentVersionTransition;
  ExpirationDate?: Value<string>;
  NoncurrentVersionExpiration?: NoncurrentVersionExpiration;
  ExpirationInDays?: Value<number>;
  Transition?: Transition;
  Id?: Value<string>;
  AbortIncompleteMultipartUpload?: AbortIncompleteMultipartUpload;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}

export class S3KeyFilter {
  Rules!: List<FilterRule>;
  constructor(properties: S3KeyFilter) {
    Object.assign(this, properties);
  }
}

export class S3TablesDestination {
  TableBucketArn!: Value<string>;
  TableName!: Value<string>;
  TableArn?: Value<string>;
  TableNamespace?: Value<string>;
  constructor(properties: S3TablesDestination) {
    Object.assign(this, properties);
  }
}

export class ServerSideEncryptionByDefault {
  SSEAlgorithm!: Value<string>;
  KMSMasterKeyID?: Value<string>;
  constructor(properties: ServerSideEncryptionByDefault) {
    Object.assign(this, properties);
  }
}

export class ServerSideEncryptionRule {
  BucketKeyEnabled?: Value<boolean>;
  ServerSideEncryptionByDefault?: ServerSideEncryptionByDefault;
  constructor(properties: ServerSideEncryptionRule) {
    Object.assign(this, properties);
  }
}

export class SourceSelectionCriteria {
  ReplicaModifications?: ReplicaModifications;
  SseKmsEncryptedObjects?: SseKmsEncryptedObjects;
  constructor(properties: SourceSelectionCriteria) {
    Object.assign(this, properties);
  }
}

export class SseKmsEncryptedObjects {
  Status!: Value<string>;
  constructor(properties: SseKmsEncryptedObjects) {
    Object.assign(this, properties);
  }
}

export class StorageClassAnalysis {
  DataExport?: DataExport;
  constructor(properties: StorageClassAnalysis) {
    Object.assign(this, properties);
  }
}

export class TagFilter {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagFilter) {
    Object.assign(this, properties);
  }
}

export class TargetObjectKeyFormat {
  PartitionedPrefix?: PartitionedPrefix;
  SimplePrefix?: { [key: string]: any };
  constructor(properties: TargetObjectKeyFormat) {
    Object.assign(this, properties);
  }
}

export class Tiering {
  AccessTier!: Value<string>;
  Days!: Value<number>;
  constructor(properties: Tiering) {
    Object.assign(this, properties);
  }
}

export class TopicConfiguration {
  Filter?: NotificationFilter;
  Event!: Value<string>;
  Topic!: Value<string>;
  constructor(properties: TopicConfiguration) {
    Object.assign(this, properties);
  }
}

export class Transition {
  TransitionDate?: Value<string>;
  StorageClass!: Value<string>;
  TransitionInDays?: Value<number>;
  constructor(properties: Transition) {
    Object.assign(this, properties);
  }
}

export class VersioningConfiguration {
  Status!: Value<string>;
  constructor(properties: VersioningConfiguration) {
    Object.assign(this, properties);
  }
}

export class WebsiteConfiguration {
  IndexDocument?: Value<string>;
  RedirectAllRequestsTo?: RedirectAllRequestsTo;
  RoutingRules?: List<RoutingRule>;
  ErrorDocument?: Value<string>;
  constructor(properties: WebsiteConfiguration) {
    Object.assign(this, properties);
  }
}
export interface BucketProperties {
  InventoryConfigurations?: List<InventoryConfiguration>;
  BucketEncryption?: BucketEncryption;
  WebsiteConfiguration?: WebsiteConfiguration;
  NotificationConfiguration?: NotificationConfiguration;
  LifecycleConfiguration?: LifecycleConfiguration;
  VersioningConfiguration?: VersioningConfiguration;
  MetricsConfigurations?: List<MetricsConfiguration>;
  AccessControl?: Value<string>;
  MetadataTableConfiguration?: MetadataTableConfiguration;
  IntelligentTieringConfigurations?: List<IntelligentTieringConfiguration>;
  AnalyticsConfigurations?: List<AnalyticsConfiguration>;
  AccelerateConfiguration?: AccelerateConfiguration;
  PublicAccessBlockConfiguration?: PublicAccessBlockConfiguration;
  BucketName?: Value<string>;
  CorsConfiguration?: CorsConfiguration;
  OwnershipControls?: OwnershipControls;
  ObjectLockConfiguration?: ObjectLockConfiguration;
  ObjectLockEnabled?: Value<boolean>;
  LoggingConfiguration?: LoggingConfiguration;
  MetadataConfiguration?: MetadataConfiguration;
  ReplicationConfiguration?: ReplicationConfiguration;
  Tags?: List<ResourceTag>;
}
export default class Bucket extends ResourceBase<BucketProperties> {
  static AbortIncompleteMultipartUpload = AbortIncompleteMultipartUpload;
  static AccelerateConfiguration = AccelerateConfiguration;
  static AccessControlTranslation = AccessControlTranslation;
  static AnalyticsConfiguration = AnalyticsConfiguration;
  static BucketEncryption = BucketEncryption;
  static CorsConfiguration = CorsConfiguration;
  static CorsRule = CorsRule;
  static DataExport = DataExport;
  static DefaultRetention = DefaultRetention;
  static DeleteMarkerReplication = DeleteMarkerReplication;
  static Destination = Destination;
  static EncryptionConfiguration = EncryptionConfiguration;
  static EventBridgeConfiguration = EventBridgeConfiguration;
  static FilterRule = FilterRule;
  static IntelligentTieringConfiguration = IntelligentTieringConfiguration;
  static InventoryConfiguration = InventoryConfiguration;
  static InventoryTableConfiguration = InventoryTableConfiguration;
  static JournalTableConfiguration = JournalTableConfiguration;
  static LambdaConfiguration = LambdaConfiguration;
  static LifecycleConfiguration = LifecycleConfiguration;
  static LoggingConfiguration = LoggingConfiguration;
  static MetadataConfiguration = MetadataConfiguration;
  static MetadataDestination = MetadataDestination;
  static MetadataTableConfiguration = MetadataTableConfiguration;
  static MetadataTableEncryptionConfiguration = MetadataTableEncryptionConfiguration;
  static Metrics = Metrics;
  static MetricsConfiguration = MetricsConfiguration;
  static NoncurrentVersionExpiration = NoncurrentVersionExpiration;
  static NoncurrentVersionTransition = NoncurrentVersionTransition;
  static NotificationConfiguration = NotificationConfiguration;
  static NotificationFilter = NotificationFilter;
  static ObjectLockConfiguration = ObjectLockConfiguration;
  static ObjectLockRule = ObjectLockRule;
  static OwnershipControls = OwnershipControls;
  static OwnershipControlsRule = OwnershipControlsRule;
  static PartitionedPrefix = PartitionedPrefix;
  static PublicAccessBlockConfiguration = PublicAccessBlockConfiguration;
  static QueueConfiguration = QueueConfiguration;
  static RecordExpiration = RecordExpiration;
  static RedirectAllRequestsTo = RedirectAllRequestsTo;
  static RedirectRule = RedirectRule;
  static ReplicaModifications = ReplicaModifications;
  static ReplicationConfiguration = ReplicationConfiguration;
  static ReplicationDestination = ReplicationDestination;
  static ReplicationRule = ReplicationRule;
  static ReplicationRuleAndOperator = ReplicationRuleAndOperator;
  static ReplicationRuleFilter = ReplicationRuleFilter;
  static ReplicationTime = ReplicationTime;
  static ReplicationTimeValue = ReplicationTimeValue;
  static RoutingRule = RoutingRule;
  static RoutingRuleCondition = RoutingRuleCondition;
  static Rule = Rule;
  static S3KeyFilter = S3KeyFilter;
  static S3TablesDestination = S3TablesDestination;
  static ServerSideEncryptionByDefault = ServerSideEncryptionByDefault;
  static ServerSideEncryptionRule = ServerSideEncryptionRule;
  static SourceSelectionCriteria = SourceSelectionCriteria;
  static SseKmsEncryptedObjects = SseKmsEncryptedObjects;
  static StorageClassAnalysis = StorageClassAnalysis;
  static TagFilter = TagFilter;
  static TargetObjectKeyFormat = TargetObjectKeyFormat;
  static Tiering = Tiering;
  static TopicConfiguration = TopicConfiguration;
  static Transition = Transition;
  static VersioningConfiguration = VersioningConfiguration;
  static WebsiteConfiguration = WebsiteConfiguration;
  constructor(properties?: BucketProperties) {
    super('AWS::S3::Bucket', properties || {});
  }
}
