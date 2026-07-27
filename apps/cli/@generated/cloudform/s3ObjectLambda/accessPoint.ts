import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Alias {
  Status?: Value<string>;
  Value!: Value<string>;
  constructor(properties: Alias) {
    Object.assign(this, properties);
  }
}

export class AwsLambda {
  FunctionArn!: Value<string>;
  FunctionPayload?: Value<string>;
  constructor(properties: AwsLambda) {
    Object.assign(this, properties);
  }
}

export class ContentTransformation {
  AwsLambda!: AwsLambda;
  constructor(properties: ContentTransformation) {
    Object.assign(this, properties);
  }
}

export class ObjectLambdaConfiguration {
  SupportingAccessPoint!: Value<string>;
  TransformationConfigurations!: List<TransformationConfiguration>;
  AllowedFeatures?: List<Value<string>>;
  CloudWatchMetricsEnabled?: Value<boolean>;
  constructor(properties: ObjectLambdaConfiguration) {
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

export class TransformationConfiguration {
  Actions!: List<Value<string>>;
  ContentTransformation!: ContentTransformation;
  constructor(properties: TransformationConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AccessPointProperties {
  ObjectLambdaConfiguration: ObjectLambdaConfiguration;
  Name?: Value<string>;
}
export default class AccessPoint extends ResourceBase<AccessPointProperties> {
  static Alias = Alias;
  static AwsLambda = AwsLambda;
  static ContentTransformation = ContentTransformation;
  static ObjectLambdaConfiguration = ObjectLambdaConfiguration;
  static PublicAccessBlockConfiguration = PublicAccessBlockConfiguration;
  static TransformationConfiguration = TransformationConfiguration;
  constructor(properties: AccessPointProperties) {
    super('AWS::S3ObjectLambda::AccessPoint', properties);
  }
}
