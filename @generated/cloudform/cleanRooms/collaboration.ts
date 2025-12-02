import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataEncryptionMetadata {
  AllowCleartext!: Value<boolean>;
  PreserveNulls!: Value<boolean>;
  AllowJoinsOnColumnsWithDifferentNames!: Value<boolean>;
  AllowDuplicates!: Value<boolean>;
  constructor(properties: DataEncryptionMetadata) {
    Object.assign(this, properties);
  }
}

export class JobComputePaymentConfig {
  IsResponsible!: Value<boolean>;
  constructor(properties: JobComputePaymentConfig) {
    Object.assign(this, properties);
  }
}

export class MLMemberAbilities {
  CustomMLMemberAbilities!: List<Value<string>>;
  constructor(properties: MLMemberAbilities) {
    Object.assign(this, properties);
  }
}

export class MLPaymentConfig {
  ModelInference?: ModelInferencePaymentConfig;
  ModelTraining?: ModelTrainingPaymentConfig;
  constructor(properties: MLPaymentConfig) {
    Object.assign(this, properties);
  }
}

export class MemberSpecification {
  AccountId!: Value<string>;
  MLMemberAbilities?: MLMemberAbilities;
  DisplayName!: Value<string>;
  MemberAbilities?: List<Value<string>>;
  PaymentConfiguration?: PaymentConfiguration;
  constructor(properties: MemberSpecification) {
    Object.assign(this, properties);
  }
}

export class ModelInferencePaymentConfig {
  IsResponsible!: Value<boolean>;
  constructor(properties: ModelInferencePaymentConfig) {
    Object.assign(this, properties);
  }
}

export class ModelTrainingPaymentConfig {
  IsResponsible!: Value<boolean>;
  constructor(properties: ModelTrainingPaymentConfig) {
    Object.assign(this, properties);
  }
}

export class PaymentConfiguration {
  JobCompute?: JobComputePaymentConfig;
  QueryCompute!: QueryComputePaymentConfig;
  MachineLearning?: MLPaymentConfig;
  constructor(properties: PaymentConfiguration) {
    Object.assign(this, properties);
  }
}

export class QueryComputePaymentConfig {
  IsResponsible!: Value<boolean>;
  constructor(properties: QueryComputePaymentConfig) {
    Object.assign(this, properties);
  }
}
export interface CollaborationProperties {
  AnalyticsEngine?: Value<string>;
  CreatorDisplayName: Value<string>;
  CreatorMemberAbilities?: List<Value<string>>;
  Description: Value<string>;
  CreatorMLMemberAbilities?: MLMemberAbilities;
  Name: Value<string>;
  JobLogStatus?: Value<string>;
  QueryLogStatus: Value<string>;
  AutoApprovedChangeTypes?: List<Value<string>>;
  CreatorPaymentConfiguration?: PaymentConfiguration;
  DataEncryptionMetadata?: DataEncryptionMetadata;
  Tags?: List<ResourceTag>;
  Members?: List<MemberSpecification>;
}
export default class Collaboration extends ResourceBase<CollaborationProperties> {
  static DataEncryptionMetadata = DataEncryptionMetadata;
  static JobComputePaymentConfig = JobComputePaymentConfig;
  static MLMemberAbilities = MLMemberAbilities;
  static MLPaymentConfig = MLPaymentConfig;
  static MemberSpecification = MemberSpecification;
  static ModelInferencePaymentConfig = ModelInferencePaymentConfig;
  static ModelTrainingPaymentConfig = ModelTrainingPaymentConfig;
  static PaymentConfiguration = PaymentConfiguration;
  static QueryComputePaymentConfig = QueryComputePaymentConfig;
  constructor(properties: CollaborationProperties) {
    super('AWS::CleanRooms::Collaboration', properties);
  }
}
