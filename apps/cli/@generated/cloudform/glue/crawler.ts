import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CatalogTarget {
  ConnectionName?: Value<string>;
  DatabaseName?: Value<string>;
  DlqEventQueueArn?: Value<string>;
  Tables?: List<Value<string>>;
  EventQueueArn?: Value<string>;
  constructor(properties: CatalogTarget) {
    Object.assign(this, properties);
  }
}

export class DeltaTarget {
  ConnectionName?: Value<string>;
  CreateNativeDeltaTable?: Value<boolean>;
  WriteManifest?: Value<boolean>;
  DeltaTables?: List<Value<string>>;
  constructor(properties: DeltaTarget) {
    Object.assign(this, properties);
  }
}

export class DynamoDBTarget {
  Path?: Value<string>;
  ScanRate?: Value<number>;
  ScanAll?: Value<boolean>;
  constructor(properties: DynamoDBTarget) {
    Object.assign(this, properties);
  }
}

export class HudiTarget {
  ConnectionName?: Value<string>;
  Exclusions?: List<Value<string>>;
  Paths?: List<Value<string>>;
  MaximumTraversalDepth?: Value<number>;
  constructor(properties: HudiTarget) {
    Object.assign(this, properties);
  }
}

export class IcebergTarget {
  ConnectionName?: Value<string>;
  Exclusions?: List<Value<string>>;
  Paths?: List<Value<string>>;
  MaximumTraversalDepth?: Value<number>;
  constructor(properties: IcebergTarget) {
    Object.assign(this, properties);
  }
}

export class JdbcTarget {
  ConnectionName?: Value<string>;
  Path?: Value<string>;
  Exclusions?: List<Value<string>>;
  EnableAdditionalMetadata?: List<Value<string>>;
  constructor(properties: JdbcTarget) {
    Object.assign(this, properties);
  }
}

export class LakeFormationConfiguration {
  AccountId?: Value<string>;
  UseLakeFormationCredentials?: Value<boolean>;
  constructor(properties: LakeFormationConfiguration) {
    Object.assign(this, properties);
  }
}

export class MongoDBTarget {
  ConnectionName?: Value<string>;
  Path?: Value<string>;
  constructor(properties: MongoDBTarget) {
    Object.assign(this, properties);
  }
}

export class RecrawlPolicy {
  RecrawlBehavior?: Value<string>;
  constructor(properties: RecrawlPolicy) {
    Object.assign(this, properties);
  }
}

export class S3Target {
  ConnectionName?: Value<string>;
  Path?: Value<string>;
  SampleSize?: Value<number>;
  Exclusions?: List<Value<string>>;
  DlqEventQueueArn?: Value<string>;
  EventQueueArn?: Value<string>;
  constructor(properties: S3Target) {
    Object.assign(this, properties);
  }
}

export class Schedule {
  ScheduleExpression?: Value<string>;
  constructor(properties: Schedule) {
    Object.assign(this, properties);
  }
}

export class SchemaChangePolicy {
  UpdateBehavior?: Value<string>;
  DeleteBehavior?: Value<string>;
  constructor(properties: SchemaChangePolicy) {
    Object.assign(this, properties);
  }
}

export class Targets {
  HudiTargets?: List<HudiTarget>;
  S3Targets?: List<S3Target>;
  CatalogTargets?: List<CatalogTarget>;
  DeltaTargets?: List<DeltaTarget>;
  MongoDBTargets?: List<MongoDBTarget>;
  JdbcTargets?: List<JdbcTarget>;
  DynamoDBTargets?: List<DynamoDBTarget>;
  IcebergTargets?: List<IcebergTarget>;
  constructor(properties: Targets) {
    Object.assign(this, properties);
  }
}
export interface CrawlerProperties {
  Classifiers?: List<Value<string>>;
  Description?: Value<string>;
  SchemaChangePolicy?: SchemaChangePolicy;
  Configuration?: Value<string>;
  RecrawlPolicy?: RecrawlPolicy;
  DatabaseName?: Value<string>;
  Targets: Targets;
  CrawlerSecurityConfiguration?: Value<string>;
  Name?: Value<string>;
  Role: Value<string>;
  LakeFormationConfiguration?: LakeFormationConfiguration;
  Schedule?: Schedule;
  TablePrefix?: Value<string>;
  Tags?: { [key: string]: any };
}
export default class Crawler extends ResourceBase<CrawlerProperties> {
  static CatalogTarget = CatalogTarget;
  static DeltaTarget = DeltaTarget;
  static DynamoDBTarget = DynamoDBTarget;
  static HudiTarget = HudiTarget;
  static IcebergTarget = IcebergTarget;
  static JdbcTarget = JdbcTarget;
  static LakeFormationConfiguration = LakeFormationConfiguration;
  static MongoDBTarget = MongoDBTarget;
  static RecrawlPolicy = RecrawlPolicy;
  static S3Target = S3Target;
  static Schedule = Schedule;
  static SchemaChangePolicy = SchemaChangePolicy;
  static Targets = Targets;
  constructor(properties: CrawlerProperties) {
    super('AWS::Glue::Crawler', properties);
  }
}
