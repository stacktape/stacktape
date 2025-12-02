import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  LambdaConfiguration?: LambdaConfiguration;
  SNSConfiguration?: SNSConfiguration;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class LambdaConfiguration {
  LambdaArn!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: LambdaConfiguration) {
    Object.assign(this, properties);
  }
}

export class SNSConfiguration {
  SnsTopicArn!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: SNSConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AlertProperties {
  AlertDescription?: Value<string>;
  Action: Action;
  AlertName?: Value<string>;
  AlertSensitivityThreshold: Value<number>;
  AnomalyDetectorArn: Value<string>;
}
export default class Alert extends ResourceBase<AlertProperties> {
  static Action = Action;
  static LambdaConfiguration = LambdaConfiguration;
  static SNSConfiguration = SNSConfiguration;
  constructor(properties: AlertProperties) {
    super('AWS::LookoutMetrics::Alert', properties);
  }
}
