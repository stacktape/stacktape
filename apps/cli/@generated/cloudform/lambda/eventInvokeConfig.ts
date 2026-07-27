import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DestinationConfig {
  OnSuccess?: OnSuccess;
  OnFailure?: OnFailure;
  constructor(properties: DestinationConfig) {
    Object.assign(this, properties);
  }
}

export class OnFailure {
  Destination!: Value<string>;
  constructor(properties: OnFailure) {
    Object.assign(this, properties);
  }
}

export class OnSuccess {
  Destination!: Value<string>;
  constructor(properties: OnSuccess) {
    Object.assign(this, properties);
  }
}
export interface EventInvokeConfigProperties {
  FunctionName: Value<string>;
  MaximumRetryAttempts?: Value<number>;
  DestinationConfig?: DestinationConfig;
  Qualifier: Value<string>;
  MaximumEventAgeInSeconds?: Value<number>;
}
export default class EventInvokeConfig extends ResourceBase<EventInvokeConfigProperties> {
  static DestinationConfig = DestinationConfig;
  static OnFailure = OnFailure;
  static OnSuccess = OnSuccess;
  constructor(properties: EventInvokeConfigProperties) {
    super('AWS::Lambda::EventInvokeConfig', properties);
  }
}
