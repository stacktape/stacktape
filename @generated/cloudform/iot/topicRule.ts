import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  CloudwatchAlarm?: CloudwatchAlarmAction;
  CloudwatchMetric?: CloudwatchMetricAction;
  DynamoDB?: DynamoDBAction;
  DynamoDBv2?: DynamoDBv2Action;
  Elasticsearch?: ElasticsearchAction;
  Firehose?: FirehoseAction;
  Http?: HttpAction;
  IotAnalytics?: IotAnalyticsAction;
  IotEvents?: IotEventsAction;
  IotSiteWise?: IotSiteWiseAction;
  Kinesis?: KinesisAction;
  Lambda?: LambdaAction;
  Republish?: RepublishAction;
  S3?: S3Action;
  Sns?: SnsAction;
  Sqs?: SqsAction;
  StepFunctions?: StepFunctionsAction;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class AssetPropertyTimestamp {
  OffsetInNanos?: Value<string>;
  TimeInSeconds!: Value<string>;
  constructor(properties: AssetPropertyTimestamp) {
    Object.assign(this, properties);
  }
}

export class AssetPropertyValue {
  Quality?: Value<string>;
  Timestamp!: AssetPropertyTimestamp;
  Value!: AssetPropertyVariant;
  constructor(properties: AssetPropertyValue) {
    Object.assign(this, properties);
  }
}

export class AssetPropertyVariant {
  BooleanValue?: Value<string>;
  DoubleValue?: Value<string>;
  IntegerValue?: Value<string>;
  StringValue?: Value<string>;
  constructor(properties: AssetPropertyVariant) {
    Object.assign(this, properties);
  }
}

export class CloudwatchAlarmAction {
  AlarmName!: Value<string>;
  RoleArn!: Value<string>;
  StateReason!: Value<string>;
  StateValue!: Value<string>;
  constructor(properties: CloudwatchAlarmAction) {
    Object.assign(this, properties);
  }
}

export class CloudwatchMetricAction {
  MetricName!: Value<string>;
  MetricNamespace!: Value<string>;
  MetricTimestamp?: Value<string>;
  MetricUnit!: Value<string>;
  MetricValue!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: CloudwatchMetricAction) {
    Object.assign(this, properties);
  }
}

export class DynamoDBAction {
  HashKeyField!: Value<string>;
  HashKeyType?: Value<string>;
  HashKeyValue!: Value<string>;
  PayloadField?: Value<string>;
  RangeKeyField?: Value<string>;
  RangeKeyType?: Value<string>;
  RangeKeyValue?: Value<string>;
  RoleArn!: Value<string>;
  TableName!: Value<string>;
  constructor(properties: DynamoDBAction) {
    Object.assign(this, properties);
  }
}

export class DynamoDBv2Action {
  PutItem?: PutItemInput;
  RoleArn?: Value<string>;
  constructor(properties: DynamoDBv2Action) {
    Object.assign(this, properties);
  }
}

export class ElasticsearchAction {
  Endpoint!: Value<string>;
  Id!: Value<string>;
  Index!: Value<string>;
  RoleArn!: Value<string>;
  Type!: Value<string>;
  constructor(properties: ElasticsearchAction) {
    Object.assign(this, properties);
  }
}

export class FirehoseAction {
  DeliveryStreamName!: Value<string>;
  RoleArn!: Value<string>;
  Separator?: Value<string>;
  constructor(properties: FirehoseAction) {
    Object.assign(this, properties);
  }
}

export class HttpAction {
  Auth?: HttpAuthorization;
  ConfirmationUrl?: Value<string>;
  Headers?: List<HttpActionHeader>;
  Url!: Value<string>;
  constructor(properties: HttpAction) {
    Object.assign(this, properties);
  }
}

export class HttpActionHeader {
  Key!: Value<string>;
  Value!: Value<string>;
  constructor(properties: HttpActionHeader) {
    Object.assign(this, properties);
  }
}

export class HttpAuthorization {
  Sigv4?: SigV4Authorization;
  constructor(properties: HttpAuthorization) {
    Object.assign(this, properties);
  }
}

export class IotAnalyticsAction {
  ChannelName!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: IotAnalyticsAction) {
    Object.assign(this, properties);
  }
}

export class IotEventsAction {
  InputName!: Value<string>;
  MessageId?: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: IotEventsAction) {
    Object.assign(this, properties);
  }
}

export class IotSiteWiseAction {
  PutAssetPropertyValueEntries!: List<PutAssetPropertyValueEntry>;
  RoleArn!: Value<string>;
  constructor(properties: IotSiteWiseAction) {
    Object.assign(this, properties);
  }
}

export class KinesisAction {
  PartitionKey?: Value<string>;
  RoleArn!: Value<string>;
  StreamName!: Value<string>;
  constructor(properties: KinesisAction) {
    Object.assign(this, properties);
  }
}

export class LambdaAction {
  FunctionArn?: Value<string>;
  constructor(properties: LambdaAction) {
    Object.assign(this, properties);
  }
}

export class PutAssetPropertyValueEntry {
  AssetId?: Value<string>;
  EntryId?: Value<string>;
  PropertyAlias?: Value<string>;
  PropertyId?: Value<string>;
  PropertyValues!: List<AssetPropertyValue>;
  constructor(properties: PutAssetPropertyValueEntry) {
    Object.assign(this, properties);
  }
}

export class PutItemInput {
  TableName!: Value<string>;
  constructor(properties: PutItemInput) {
    Object.assign(this, properties);
  }
}

export class RepublishAction {
  Qos?: Value<number>;
  RoleArn!: Value<string>;
  Topic!: Value<string>;
  constructor(properties: RepublishAction) {
    Object.assign(this, properties);
  }
}

export class S3Action {
  BucketName!: Value<string>;
  Key!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: S3Action) {
    Object.assign(this, properties);
  }
}

export class SigV4Authorization {
  RoleArn!: Value<string>;
  ServiceName!: Value<string>;
  SigningRegion!: Value<string>;
  constructor(properties: SigV4Authorization) {
    Object.assign(this, properties);
  }
}

export class SnsAction {
  MessageFormat?: Value<string>;
  RoleArn!: Value<string>;
  TargetArn!: Value<string>;
  constructor(properties: SnsAction) {
    Object.assign(this, properties);
  }
}

export class SqsAction {
  QueueUrl!: Value<string>;
  RoleArn!: Value<string>;
  UseBase64?: Value<boolean>;
  constructor(properties: SqsAction) {
    Object.assign(this, properties);
  }
}

export class StepFunctionsAction {
  ExecutionNamePrefix?: Value<string>;
  RoleArn!: Value<string>;
  StateMachineName!: Value<string>;
  constructor(properties: StepFunctionsAction) {
    Object.assign(this, properties);
  }
}

export class TopicRulePayload {
  Actions!: List<Action>;
  AwsIotSqlVersion?: Value<string>;
  Description?: Value<string>;
  ErrorAction?: Action;
  RuleDisabled!: Value<boolean>;
  Sql!: Value<string>;
  constructor(properties: TopicRulePayload) {
    Object.assign(this, properties);
  }
}
export interface TopicRuleProperties {
  RuleName?: Value<string>;
  TopicRulePayload: TopicRulePayload;
}
export default class TopicRule extends ResourceBase<TopicRuleProperties> {
  static Action = Action;
  static AssetPropertyTimestamp = AssetPropertyTimestamp;
  static AssetPropertyValue = AssetPropertyValue;
  static AssetPropertyVariant = AssetPropertyVariant;
  static CloudwatchAlarmAction = CloudwatchAlarmAction;
  static CloudwatchMetricAction = CloudwatchMetricAction;
  static DynamoDBAction = DynamoDBAction;
  static DynamoDBv2Action = DynamoDBv2Action;
  static ElasticsearchAction = ElasticsearchAction;
  static FirehoseAction = FirehoseAction;
  static HttpAction = HttpAction;
  static HttpActionHeader = HttpActionHeader;
  static HttpAuthorization = HttpAuthorization;
  static IotAnalyticsAction = IotAnalyticsAction;
  static IotEventsAction = IotEventsAction;
  static IotSiteWiseAction = IotSiteWiseAction;
  static KinesisAction = KinesisAction;
  static LambdaAction = LambdaAction;
  static PutAssetPropertyValueEntry = PutAssetPropertyValueEntry;
  static PutItemInput = PutItemInput;
  static RepublishAction = RepublishAction;
  static S3Action = S3Action;
  static SigV4Authorization = SigV4Authorization;
  static SnsAction = SnsAction;
  static SqsAction = SqsAction;
  static StepFunctionsAction = StepFunctionsAction;
  static TopicRulePayload = TopicRulePayload;
  constructor(properties: TopicRuleProperties) {
    super('AWS::IoT::TopicRule', properties);
  }
}
