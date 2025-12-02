import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IngressAnalysis {
  Analyzer!: Value<string>;
  ResultField!: Value<string>;
  constructor(properties: IngressAnalysis) {
    Object.assign(this, properties);
  }
}

export class IngressBooleanExpression {
  Operator!: Value<string>;
  Evaluate!: IngressBooleanToEvaluate;
  constructor(properties: IngressBooleanExpression) {
    Object.assign(this, properties);
  }
}

export class IngressBooleanToEvaluate {
  IsInAddressList?: IngressIsInAddressList;
  Analysis?: IngressAnalysis;
  constructor(properties: IngressBooleanToEvaluate) {
    Object.assign(this, properties);
  }
}

export class IngressIpToEvaluate {
  Attribute!: Value<string>;
  constructor(properties: IngressIpToEvaluate) {
    Object.assign(this, properties);
  }
}

export class IngressIpv4Expression {
  Operator!: Value<string>;
  Evaluate!: IngressIpToEvaluate;
  Values!: List<Value<string>>;
  constructor(properties: IngressIpv4Expression) {
    Object.assign(this, properties);
  }
}

export class IngressIpv6Expression {
  Operator!: Value<string>;
  Evaluate!: IngressIpv6ToEvaluate;
  Values!: List<Value<string>>;
  constructor(properties: IngressIpv6Expression) {
    Object.assign(this, properties);
  }
}

export class IngressIpv6ToEvaluate {
  Attribute!: Value<string>;
  constructor(properties: IngressIpv6ToEvaluate) {
    Object.assign(this, properties);
  }
}

export class IngressIsInAddressList {
  Attribute!: Value<string>;
  AddressLists!: List<Value<string>>;
  constructor(properties: IngressIsInAddressList) {
    Object.assign(this, properties);
  }
}

export class IngressStringExpression {
  Operator!: Value<string>;
  Evaluate!: IngressStringToEvaluate;
  Values!: List<Value<string>>;
  constructor(properties: IngressStringExpression) {
    Object.assign(this, properties);
  }
}

export class IngressStringToEvaluate {
  Attribute?: Value<string>;
  Analysis?: IngressAnalysis;
  constructor(properties: IngressStringToEvaluate) {
    Object.assign(this, properties);
  }
}

export class IngressTlsProtocolExpression {
  Operator!: Value<string>;
  Evaluate!: IngressTlsProtocolToEvaluate;
  Value!: Value<string>;
  constructor(properties: IngressTlsProtocolExpression) {
    Object.assign(this, properties);
  }
}

export class IngressTlsProtocolToEvaluate {
  Attribute!: Value<string>;
  constructor(properties: IngressTlsProtocolToEvaluate) {
    Object.assign(this, properties);
  }
}

export class PolicyCondition {
  Ipv6Expression?: IngressIpv6Expression;
  BooleanExpression?: IngressBooleanExpression;
  StringExpression?: IngressStringExpression;
  TlsExpression?: IngressTlsProtocolExpression;
  IpExpression?: IngressIpv4Expression;
  constructor(properties: PolicyCondition) {
    Object.assign(this, properties);
  }
}

export class PolicyStatement {
  Action!: Value<string>;
  Conditions!: List<PolicyCondition>;
  constructor(properties: PolicyStatement) {
    Object.assign(this, properties);
  }
}
export interface MailManagerTrafficPolicyProperties {
  DefaultAction: Value<string>;
  PolicyStatements: List<PolicyStatement>;
  TrafficPolicyName?: Value<string>;
  MaxMessageSizeBytes?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class MailManagerTrafficPolicy extends ResourceBase<MailManagerTrafficPolicyProperties> {
  static IngressAnalysis = IngressAnalysis;
  static IngressBooleanExpression = IngressBooleanExpression;
  static IngressBooleanToEvaluate = IngressBooleanToEvaluate;
  static IngressIpToEvaluate = IngressIpToEvaluate;
  static IngressIpv4Expression = IngressIpv4Expression;
  static IngressIpv6Expression = IngressIpv6Expression;
  static IngressIpv6ToEvaluate = IngressIpv6ToEvaluate;
  static IngressIsInAddressList = IngressIsInAddressList;
  static IngressStringExpression = IngressStringExpression;
  static IngressStringToEvaluate = IngressStringToEvaluate;
  static IngressTlsProtocolExpression = IngressTlsProtocolExpression;
  static IngressTlsProtocolToEvaluate = IngressTlsProtocolToEvaluate;
  static PolicyCondition = PolicyCondition;
  static PolicyStatement = PolicyStatement;
  constructor(properties: MailManagerTrafficPolicyProperties) {
    super('AWS::SES::MailManagerTrafficPolicy', properties);
  }
}
