import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MembershipJobComputePaymentConfig {
  IsResponsible!: Value<boolean>;
  constructor(properties: MembershipJobComputePaymentConfig) {
    Object.assign(this, properties);
  }
}

export class MembershipMLPaymentConfig {
  ModelInference?: MembershipModelInferencePaymentConfig;
  ModelTraining?: MembershipModelTrainingPaymentConfig;
  constructor(properties: MembershipMLPaymentConfig) {
    Object.assign(this, properties);
  }
}

export class MembershipModelInferencePaymentConfig {
  IsResponsible!: Value<boolean>;
  constructor(properties: MembershipModelInferencePaymentConfig) {
    Object.assign(this, properties);
  }
}

export class MembershipModelTrainingPaymentConfig {
  IsResponsible!: Value<boolean>;
  constructor(properties: MembershipModelTrainingPaymentConfig) {
    Object.assign(this, properties);
  }
}

export class MembershipPaymentConfiguration {
  JobCompute?: MembershipJobComputePaymentConfig;
  QueryCompute!: MembershipQueryComputePaymentConfig;
  MachineLearning?: MembershipMLPaymentConfig;
  constructor(properties: MembershipPaymentConfiguration) {
    Object.assign(this, properties);
  }
}

export class MembershipProtectedJobOutputConfiguration {
  S3!: ProtectedJobS3OutputConfigurationInput;
  constructor(properties: MembershipProtectedJobOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class MembershipProtectedJobResultConfiguration {
  OutputConfiguration!: MembershipProtectedJobOutputConfiguration;
  RoleArn!: Value<string>;
  constructor(properties: MembershipProtectedJobResultConfiguration) {
    Object.assign(this, properties);
  }
}

export class MembershipProtectedQueryOutputConfiguration {
  S3!: ProtectedQueryS3OutputConfiguration;
  constructor(properties: MembershipProtectedQueryOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class MembershipProtectedQueryResultConfiguration {
  OutputConfiguration!: MembershipProtectedQueryOutputConfiguration;
  RoleArn?: Value<string>;
  constructor(properties: MembershipProtectedQueryResultConfiguration) {
    Object.assign(this, properties);
  }
}

export class MembershipQueryComputePaymentConfig {
  IsResponsible!: Value<boolean>;
  constructor(properties: MembershipQueryComputePaymentConfig) {
    Object.assign(this, properties);
  }
}

export class ProtectedJobS3OutputConfigurationInput {
  Bucket!: Value<string>;
  KeyPrefix?: Value<string>;
  constructor(properties: ProtectedJobS3OutputConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class ProtectedQueryS3OutputConfiguration {
  Bucket!: Value<string>;
  ResultFormat!: Value<string>;
  KeyPrefix?: Value<string>;
  SingleFileOutput?: Value<boolean>;
  constructor(properties: ProtectedQueryS3OutputConfiguration) {
    Object.assign(this, properties);
  }
}
export interface MembershipProperties {
  CollaborationIdentifier: Value<string>;
  JobLogStatus?: Value<string>;
  DefaultResultConfiguration?: MembershipProtectedQueryResultConfiguration;
  QueryLogStatus: Value<string>;
  DefaultJobResultConfiguration?: MembershipProtectedJobResultConfiguration;
  Tags?: List<ResourceTag>;
  PaymentConfiguration?: MembershipPaymentConfiguration;
}
export default class Membership extends ResourceBase<MembershipProperties> {
  static MembershipJobComputePaymentConfig = MembershipJobComputePaymentConfig;
  static MembershipMLPaymentConfig = MembershipMLPaymentConfig;
  static MembershipModelInferencePaymentConfig = MembershipModelInferencePaymentConfig;
  static MembershipModelTrainingPaymentConfig = MembershipModelTrainingPaymentConfig;
  static MembershipPaymentConfiguration = MembershipPaymentConfiguration;
  static MembershipProtectedJobOutputConfiguration = MembershipProtectedJobOutputConfiguration;
  static MembershipProtectedJobResultConfiguration = MembershipProtectedJobResultConfiguration;
  static MembershipProtectedQueryOutputConfiguration = MembershipProtectedQueryOutputConfiguration;
  static MembershipProtectedQueryResultConfiguration = MembershipProtectedQueryResultConfiguration;
  static MembershipQueryComputePaymentConfig = MembershipQueryComputePaymentConfig;
  static ProtectedJobS3OutputConfigurationInput = ProtectedJobS3OutputConfigurationInput;
  static ProtectedQueryS3OutputConfiguration = ProtectedQueryS3OutputConfiguration;
  constructor(properties: MembershipProperties) {
    super('AWS::CleanRooms::Membership', properties);
  }
}
