import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Actions {
  EventBridgeActions?: List<EventBridgeAction>;
  UpdateCaseActions?: List<UpdateCaseAction>;
  CreateCaseActions?: List<CreateCaseAction>;
  AssignContactCategoryActions?: List<{ [key: string]: any }>;
  TaskActions?: List<TaskAction>;
  SubmitAutoEvaluationActions?: List<SubmitAutoEvaluationAction>;
  SendNotificationActions?: List<SendNotificationAction>;
  EndAssociatedTasksActions?: List<{ [key: string]: any }>;
  constructor(properties: Actions) {
    Object.assign(this, properties);
  }
}

export class CreateCaseAction {
  Fields!: List<Field>;
  TemplateId!: Value<string>;
  constructor(properties: CreateCaseAction) {
    Object.assign(this, properties);
  }
}

export class EventBridgeAction {
  Name!: Value<string>;
  constructor(properties: EventBridgeAction) {
    Object.assign(this, properties);
  }
}

export class Field {
  Value!: FieldValue;
  Id!: Value<string>;
  constructor(properties: Field) {
    Object.assign(this, properties);
  }
}

export class FieldValue {
  DoubleValue?: Value<number>;
  BooleanValue?: Value<boolean>;
  StringValue?: Value<string>;
  EmptyValue?: { [key: string]: any };
  constructor(properties: FieldValue) {
    Object.assign(this, properties);
  }
}

export class NotificationRecipientType {
  UserTags?: { [key: string]: Value<string> };
  UserArns?: List<Value<string>>;
  constructor(properties: NotificationRecipientType) {
    Object.assign(this, properties);
  }
}

export class Reference {
  Type!: Value<string>;
  Value!: Value<string>;
  constructor(properties: Reference) {
    Object.assign(this, properties);
  }
}

export class RuleTriggerEventSource {
  IntegrationAssociationArn?: Value<string>;
  EventSourceName!: Value<string>;
  constructor(properties: RuleTriggerEventSource) {
    Object.assign(this, properties);
  }
}

export class SendNotificationAction {
  DeliveryMethod!: Value<string>;
  ContentType!: Value<string>;
  Content!: Value<string>;
  Recipient!: NotificationRecipientType;
  Subject?: Value<string>;
  constructor(properties: SendNotificationAction) {
    Object.assign(this, properties);
  }
}

export class SubmitAutoEvaluationAction {
  EvaluationFormArn!: Value<string>;
  constructor(properties: SubmitAutoEvaluationAction) {
    Object.assign(this, properties);
  }
}

export class TaskAction {
  Description?: Value<string>;
  References?: { [key: string]: Reference };
  ContactFlowArn!: Value<string>;
  Name!: Value<string>;
  constructor(properties: TaskAction) {
    Object.assign(this, properties);
  }
}

export class UpdateCaseAction {
  Fields!: List<Field>;
  constructor(properties: UpdateCaseAction) {
    Object.assign(this, properties);
  }
}
export interface RuleProperties {
  Function: Value<string>;
  TriggerEventSource: RuleTriggerEventSource;
  Actions: Actions;
  InstanceArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  PublishStatus: Value<string>;
}
export default class Rule extends ResourceBase<RuleProperties> {
  static Actions = Actions;
  static CreateCaseAction = CreateCaseAction;
  static EventBridgeAction = EventBridgeAction;
  static Field = Field;
  static FieldValue = FieldValue;
  static NotificationRecipientType = NotificationRecipientType;
  static Reference = Reference;
  static RuleTriggerEventSource = RuleTriggerEventSource;
  static SendNotificationAction = SendNotificationAction;
  static SubmitAutoEvaluationAction = SubmitAutoEvaluationAction;
  static TaskAction = TaskAction;
  static UpdateCaseAction = UpdateCaseAction;
  constructor(properties: RuleProperties) {
    super('AWS::Connect::Rule', properties);
  }
}
