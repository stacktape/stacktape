import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class HostedRotationLambda {
  Runtime?: Value<string>;
  KmsKeyArn?: Value<string>;
  MasterSecretArn?: Value<string>;
  RotationLambdaName?: Value<string>;
  RotationType!: Value<string>;
  ExcludeCharacters?: Value<string>;
  VpcSecurityGroupIds?: Value<string>;
  MasterSecretKmsKeyArn?: Value<string>;
  SuperuserSecretArn?: Value<string>;
  SuperuserSecretKmsKeyArn?: Value<string>;
  VpcSubnetIds?: Value<string>;
  constructor(properties: HostedRotationLambda) {
    Object.assign(this, properties);
  }
}

export class RotationRules {
  ScheduleExpression?: Value<string>;
  Duration?: Value<string>;
  AutomaticallyAfterDays?: Value<number>;
  constructor(properties: RotationRules) {
    Object.assign(this, properties);
  }
}
export interface RotationScheduleProperties {
  HostedRotationLambda?: HostedRotationLambda;
  SecretId: Value<string>;
  RotateImmediatelyOnUpdate?: Value<boolean>;
  RotationLambdaARN?: Value<string>;
  RotationRules?: RotationRules;
}
export default class RotationSchedule extends ResourceBase<RotationScheduleProperties> {
  static HostedRotationLambda = HostedRotationLambda;
  static RotationRules = RotationRules;
  constructor(properties: RotationScheduleProperties) {
    super('AWS::SecretsManager::RotationSchedule', properties);
  }
}
