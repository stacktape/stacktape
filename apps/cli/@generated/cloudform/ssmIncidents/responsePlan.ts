import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  SsmAutomation?: SsmAutomation;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class ChatChannel {
  ChatbotSns?: List<Value<string>>;
  constructor(properties: ChatChannel) {
    Object.assign(this, properties);
  }
}

export class DynamicSsmParameter {
  Value!: DynamicSsmParameterValue;
  Key!: Value<string>;
  constructor(properties: DynamicSsmParameter) {
    Object.assign(this, properties);
  }
}

export class DynamicSsmParameterValue {
  Variable?: Value<string>;
  constructor(properties: DynamicSsmParameterValue) {
    Object.assign(this, properties);
  }
}

export class IncidentTemplate {
  Impact!: Value<number>;
  IncidentTags?: List<ResourceTag>;
  Summary?: Value<string>;
  Title!: Value<string>;
  NotificationTargets?: List<NotificationTargetItem>;
  DedupeString?: Value<string>;
  constructor(properties: IncidentTemplate) {
    Object.assign(this, properties);
  }
}

export class Integration {
  PagerDutyConfiguration!: PagerDutyConfiguration;
  constructor(properties: Integration) {
    Object.assign(this, properties);
  }
}

export class NotificationTargetItem {
  SnsTopicArn?: Value<string>;
  constructor(properties: NotificationTargetItem) {
    Object.assign(this, properties);
  }
}

export class PagerDutyConfiguration {
  SecretId!: Value<string>;
  PagerDutyIncidentConfiguration!: PagerDutyIncidentConfiguration;
  Name!: Value<string>;
  constructor(properties: PagerDutyConfiguration) {
    Object.assign(this, properties);
  }
}

export class PagerDutyIncidentConfiguration {
  ServiceId!: Value<string>;
  constructor(properties: PagerDutyIncidentConfiguration) {
    Object.assign(this, properties);
  }
}

export class SsmAutomation {
  Parameters?: List<SsmParameter>;
  TargetAccount?: Value<string>;
  DynamicParameters?: List<DynamicSsmParameter>;
  DocumentVersion?: Value<string>;
  RoleArn!: Value<string>;
  DocumentName!: Value<string>;
  constructor(properties: SsmAutomation) {
    Object.assign(this, properties);
  }
}

export class SsmParameter {
  Values!: List<Value<string>>;
  Key!: Value<string>;
  constructor(properties: SsmParameter) {
    Object.assign(this, properties);
  }
}
export interface ResponsePlanProperties {
  ChatChannel?: ChatChannel;
  Integrations?: List<Integration>;
  Actions?: List<Action>;
  DisplayName?: Value<string>;
  IncidentTemplate: IncidentTemplate;
  Engagements?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ResponsePlan extends ResourceBase<ResponsePlanProperties> {
  static Action = Action;
  static ChatChannel = ChatChannel;
  static DynamicSsmParameter = DynamicSsmParameter;
  static DynamicSsmParameterValue = DynamicSsmParameterValue;
  static IncidentTemplate = IncidentTemplate;
  static Integration = Integration;
  static NotificationTargetItem = NotificationTargetItem;
  static PagerDutyConfiguration = PagerDutyConfiguration;
  static PagerDutyIncidentConfiguration = PagerDutyIncidentConfiguration;
  static SsmAutomation = SsmAutomation;
  static SsmParameter = SsmParameter;
  constructor(properties: ResponsePlanProperties) {
    super('AWS::SSMIncidents::ResponsePlan', properties);
  }
}
