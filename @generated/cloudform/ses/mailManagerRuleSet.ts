import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AddHeaderAction {
  HeaderValue!: Value<string>;
  HeaderName!: Value<string>;
  constructor(properties: AddHeaderAction) {
    Object.assign(this, properties);
  }
}

export class Analysis {
  Analyzer!: Value<string>;
  ResultField!: Value<string>;
  constructor(properties: Analysis) {
    Object.assign(this, properties);
  }
}

export class ArchiveAction {
  TargetArchive!: Value<string>;
  ActionFailurePolicy?: Value<string>;
  constructor(properties: ArchiveAction) {
    Object.assign(this, properties);
  }
}

export class DeliverToMailboxAction {
  MailboxArn!: Value<string>;
  ActionFailurePolicy?: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: DeliverToMailboxAction) {
    Object.assign(this, properties);
  }
}

export class DeliverToQBusinessAction {
  IndexId!: Value<string>;
  ActionFailurePolicy?: Value<string>;
  ApplicationId!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: DeliverToQBusinessAction) {
    Object.assign(this, properties);
  }
}

export class RelayAction {
  Relay!: Value<string>;
  MailFrom?: Value<string>;
  ActionFailurePolicy?: Value<string>;
  constructor(properties: RelayAction) {
    Object.assign(this, properties);
  }
}

export class ReplaceRecipientAction {
  ReplaceWith?: List<Value<string>>;
  constructor(properties: ReplaceRecipientAction) {
    Object.assign(this, properties);
  }
}

export class Rule {
  Actions!: List<RuleAction>;
  Conditions?: List<RuleCondition>;
  Unless?: List<RuleCondition>;
  Name?: Value<string>;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}

export class RuleAction {
  AddHeader?: AddHeaderAction;
  Relay?: RelayAction;
  DeliverToMailbox?: DeliverToMailboxAction;
  Archive?: ArchiveAction;
  ReplaceRecipient?: ReplaceRecipientAction;
  WriteToS3?: S3Action;
  PublishToSns?: SnsAction;
  DeliverToQBusiness?: DeliverToQBusinessAction;
  Drop?: { [key: string]: any };
  Send?: SendAction;
  constructor(properties: RuleAction) {
    Object.assign(this, properties);
  }
}

export class RuleBooleanExpression {
  Operator!: Value<string>;
  Evaluate!: RuleBooleanToEvaluate;
  constructor(properties: RuleBooleanExpression) {
    Object.assign(this, properties);
  }
}

export class RuleBooleanToEvaluate {
  IsInAddressList?: RuleIsInAddressList;
  Attribute?: Value<string>;
  Analysis?: Analysis;
  constructor(properties: RuleBooleanToEvaluate) {
    Object.assign(this, properties);
  }
}

export class RuleCondition {
  BooleanExpression?: RuleBooleanExpression;
  VerdictExpression?: RuleVerdictExpression;
  StringExpression?: RuleStringExpression;
  DmarcExpression?: RuleDmarcExpression;
  NumberExpression?: RuleNumberExpression;
  IpExpression?: RuleIpExpression;
  constructor(properties: RuleCondition) {
    Object.assign(this, properties);
  }
}

export class RuleDmarcExpression {
  Operator!: Value<string>;
  Values!: List<Value<string>>;
  constructor(properties: RuleDmarcExpression) {
    Object.assign(this, properties);
  }
}

export class RuleIpExpression {
  Operator!: Value<string>;
  Evaluate!: RuleIpToEvaluate;
  Values!: List<Value<string>>;
  constructor(properties: RuleIpExpression) {
    Object.assign(this, properties);
  }
}

export class RuleIpToEvaluate {
  Attribute!: Value<string>;
  constructor(properties: RuleIpToEvaluate) {
    Object.assign(this, properties);
  }
}

export class RuleIsInAddressList {
  Attribute!: Value<string>;
  AddressLists!: List<Value<string>>;
  constructor(properties: RuleIsInAddressList) {
    Object.assign(this, properties);
  }
}

export class RuleNumberExpression {
  Operator!: Value<string>;
  Evaluate!: RuleNumberToEvaluate;
  Value!: Value<number>;
  constructor(properties: RuleNumberExpression) {
    Object.assign(this, properties);
  }
}

export class RuleNumberToEvaluate {
  Attribute!: Value<string>;
  constructor(properties: RuleNumberToEvaluate) {
    Object.assign(this, properties);
  }
}

export class RuleStringExpression {
  Operator!: Value<string>;
  Evaluate!: RuleStringToEvaluate;
  Values!: List<Value<string>>;
  constructor(properties: RuleStringExpression) {
    Object.assign(this, properties);
  }
}

export class RuleStringToEvaluate {
  Attribute?: Value<string>;
  MimeHeaderAttribute?: Value<string>;
  Analysis?: Analysis;
  constructor(properties: RuleStringToEvaluate) {
    Object.assign(this, properties);
  }
}

export class RuleVerdictExpression {
  Operator!: Value<string>;
  Evaluate!: RuleVerdictToEvaluate;
  Values!: List<Value<string>>;
  constructor(properties: RuleVerdictExpression) {
    Object.assign(this, properties);
  }
}

export class RuleVerdictToEvaluate {
  Attribute?: Value<string>;
  Analysis?: Analysis;
  constructor(properties: RuleVerdictToEvaluate) {
    Object.assign(this, properties);
  }
}

export class S3Action {
  S3SseKmsKeyId?: Value<string>;
  S3Bucket!: Value<string>;
  S3Prefix?: Value<string>;
  ActionFailurePolicy?: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: S3Action) {
    Object.assign(this, properties);
  }
}

export class SendAction {
  ActionFailurePolicy?: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: SendAction) {
    Object.assign(this, properties);
  }
}

export class SnsAction {
  TopicArn!: Value<string>;
  Encoding?: Value<string>;
  ActionFailurePolicy?: Value<string>;
  RoleArn!: Value<string>;
  PayloadType?: Value<string>;
  constructor(properties: SnsAction) {
    Object.assign(this, properties);
  }
}
export interface MailManagerRuleSetProperties {
  RuleSetName?: Value<string>;
  Rules: List<Rule>;
  Tags?: List<ResourceTag>;
}
export default class MailManagerRuleSet extends ResourceBase<MailManagerRuleSetProperties> {
  static AddHeaderAction = AddHeaderAction;
  static Analysis = Analysis;
  static ArchiveAction = ArchiveAction;
  static DeliverToMailboxAction = DeliverToMailboxAction;
  static DeliverToQBusinessAction = DeliverToQBusinessAction;
  static RelayAction = RelayAction;
  static ReplaceRecipientAction = ReplaceRecipientAction;
  static Rule = Rule;
  static RuleAction = RuleAction;
  static RuleBooleanExpression = RuleBooleanExpression;
  static RuleBooleanToEvaluate = RuleBooleanToEvaluate;
  static RuleCondition = RuleCondition;
  static RuleDmarcExpression = RuleDmarcExpression;
  static RuleIpExpression = RuleIpExpression;
  static RuleIpToEvaluate = RuleIpToEvaluate;
  static RuleIsInAddressList = RuleIsInAddressList;
  static RuleNumberExpression = RuleNumberExpression;
  static RuleNumberToEvaluate = RuleNumberToEvaluate;
  static RuleStringExpression = RuleStringExpression;
  static RuleStringToEvaluate = RuleStringToEvaluate;
  static RuleVerdictExpression = RuleVerdictExpression;
  static RuleVerdictToEvaluate = RuleVerdictToEvaluate;
  static S3Action = S3Action;
  static SendAction = SendAction;
  static SnsAction = SnsAction;
  constructor(properties: MailManagerRuleSetProperties) {
    super('AWS::SES::MailManagerRuleSet', properties);
  }
}
