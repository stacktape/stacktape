import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  IotEvents?: IotEvents;
  Firehose?: Firehose;
  DynamoDB?: DynamoDB;
  IotTopicPublish?: IotTopicPublish;
  DynamoDBv2?: DynamoDBv2;
  IotSiteWise?: IotSiteWise;
  ResetTimer?: ResetTimer;
  Sqs?: Sqs;
  SetTimer?: SetTimer;
  Sns?: Sns;
  ClearTimer?: ClearTimer;
  Lambda?: Lambda;
  SetVariable?: SetVariable;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class AssetPropertyTimestamp {
  TimeInSeconds!: Value<string>;
  OffsetInNanos?: Value<string>;
  constructor(properties: AssetPropertyTimestamp) {
    Object.assign(this, properties);
  }
}

export class AssetPropertyValue {
  Quality?: Value<string>;
  Value!: AssetPropertyVariant;
  Timestamp?: AssetPropertyTimestamp;
  constructor(properties: AssetPropertyValue) {
    Object.assign(this, properties);
  }
}

export class AssetPropertyVariant {
  DoubleValue?: Value<string>;
  BooleanValue?: Value<string>;
  IntegerValue?: Value<string>;
  StringValue?: Value<string>;
  constructor(properties: AssetPropertyVariant) {
    Object.assign(this, properties);
  }
}

export class ClearTimer {
  TimerName!: Value<string>;
  constructor(properties: ClearTimer) {
    Object.assign(this, properties);
  }
}

export class DetectorModelDefinition {
  States!: List<State>;
  InitialStateName!: Value<string>;
  constructor(properties: DetectorModelDefinition) {
    Object.assign(this, properties);
  }
}

export class DynamoDB {
  TableName!: Value<string>;
  PayloadField?: Value<string>;
  RangeKeyField?: Value<string>;
  HashKeyField!: Value<string>;
  RangeKeyValue?: Value<string>;
  RangeKeyType?: Value<string>;
  HashKeyType?: Value<string>;
  HashKeyValue!: Value<string>;
  Payload?: Payload;
  Operation?: Value<string>;
  constructor(properties: DynamoDB) {
    Object.assign(this, properties);
  }
}

export class DynamoDBv2 {
  TableName!: Value<string>;
  Payload?: Payload;
  constructor(properties: DynamoDBv2) {
    Object.assign(this, properties);
  }
}

export class Event {
  Condition?: Value<string>;
  Actions?: List<Action>;
  EventName!: Value<string>;
  constructor(properties: Event) {
    Object.assign(this, properties);
  }
}

export class Firehose {
  DeliveryStreamName!: Value<string>;
  Payload?: Payload;
  Separator?: Value<string>;
  constructor(properties: Firehose) {
    Object.assign(this, properties);
  }
}

export class IotEvents {
  InputName!: Value<string>;
  Payload?: Payload;
  constructor(properties: IotEvents) {
    Object.assign(this, properties);
  }
}

export class IotSiteWise {
  EntryId?: Value<string>;
  PropertyAlias?: Value<string>;
  PropertyValue!: AssetPropertyValue;
  AssetId?: Value<string>;
  PropertyId?: Value<string>;
  constructor(properties: IotSiteWise) {
    Object.assign(this, properties);
  }
}

export class IotTopicPublish {
  MqttTopic!: Value<string>;
  Payload?: Payload;
  constructor(properties: IotTopicPublish) {
    Object.assign(this, properties);
  }
}

export class Lambda {
  FunctionArn!: Value<string>;
  Payload?: Payload;
  constructor(properties: Lambda) {
    Object.assign(this, properties);
  }
}

export class OnEnter {
  Events?: List<Event>;
  constructor(properties: OnEnter) {
    Object.assign(this, properties);
  }
}

export class OnExit {
  Events?: List<Event>;
  constructor(properties: OnExit) {
    Object.assign(this, properties);
  }
}

export class OnInput {
  Events?: List<Event>;
  TransitionEvents?: List<TransitionEvent>;
  constructor(properties: OnInput) {
    Object.assign(this, properties);
  }
}

export class Payload {
  ContentExpression!: Value<string>;
  Type!: Value<string>;
  constructor(properties: Payload) {
    Object.assign(this, properties);
  }
}

export class ResetTimer {
  TimerName!: Value<string>;
  constructor(properties: ResetTimer) {
    Object.assign(this, properties);
  }
}

export class SetTimer {
  Seconds?: Value<number>;
  TimerName!: Value<string>;
  DurationExpression?: Value<string>;
  constructor(properties: SetTimer) {
    Object.assign(this, properties);
  }
}

export class SetVariable {
  Value!: Value<string>;
  VariableName!: Value<string>;
  constructor(properties: SetVariable) {
    Object.assign(this, properties);
  }
}

export class Sns {
  TargetArn!: Value<string>;
  Payload?: Payload;
  constructor(properties: Sns) {
    Object.assign(this, properties);
  }
}

export class Sqs {
  UseBase64?: Value<boolean>;
  Payload?: Payload;
  QueueUrl!: Value<string>;
  constructor(properties: Sqs) {
    Object.assign(this, properties);
  }
}

export class State {
  OnInput?: OnInput;
  OnExit?: OnExit;
  StateName!: Value<string>;
  OnEnter?: OnEnter;
  constructor(properties: State) {
    Object.assign(this, properties);
  }
}

export class TransitionEvent {
  Condition!: Value<string>;
  Actions?: List<Action>;
  NextState!: Value<string>;
  EventName!: Value<string>;
  constructor(properties: TransitionEvent) {
    Object.assign(this, properties);
  }
}
export interface DetectorModelProperties {
  DetectorModelDefinition: DetectorModelDefinition;
  EvaluationMethod?: Value<string>;
  DetectorModelName?: Value<string>;
  DetectorModelDescription?: Value<string>;
  Key?: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DetectorModel extends ResourceBase<DetectorModelProperties> {
  static Action = Action;
  static AssetPropertyTimestamp = AssetPropertyTimestamp;
  static AssetPropertyValue = AssetPropertyValue;
  static AssetPropertyVariant = AssetPropertyVariant;
  static ClearTimer = ClearTimer;
  static DetectorModelDefinition = DetectorModelDefinition;
  static DynamoDB = DynamoDB;
  static DynamoDBv2 = DynamoDBv2;
  static Event = Event;
  static Firehose = Firehose;
  static IotEvents = IotEvents;
  static IotSiteWise = IotSiteWise;
  static IotTopicPublish = IotTopicPublish;
  static Lambda = Lambda;
  static OnEnter = OnEnter;
  static OnExit = OnExit;
  static OnInput = OnInput;
  static Payload = Payload;
  static ResetTimer = ResetTimer;
  static SetTimer = SetTimer;
  static SetVariable = SetVariable;
  static Sns = Sns;
  static Sqs = Sqs;
  static State = State;
  static TransitionEvent = TransitionEvent;
  constructor(properties: DetectorModelProperties) {
    super('AWS::IoTEvents::DetectorModel', properties);
  }
}
