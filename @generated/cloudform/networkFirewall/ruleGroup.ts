import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ActionDefinition {
  PublishMetricAction?: PublishMetricAction;
  constructor(properties: ActionDefinition) {
    Object.assign(this, properties);
  }
}

export class Address {
  AddressDefinition!: Value<string>;
  constructor(properties: Address) {
    Object.assign(this, properties);
  }
}

export class CustomAction {
  ActionName!: Value<string>;
  ActionDefinition!: ActionDefinition;
  constructor(properties: CustomAction) {
    Object.assign(this, properties);
  }
}

export class Dimension {
  Value!: Value<string>;
  constructor(properties: Dimension) {
    Object.assign(this, properties);
  }
}

export class Header {
  Destination!: Value<string>;
  Protocol!: Value<string>;
  SourcePort!: Value<string>;
  Direction!: Value<string>;
  DestinationPort!: Value<string>;
  Source!: Value<string>;
  constructor(properties: Header) {
    Object.assign(this, properties);
  }
}

export class IPSet {
  Definition?: List<Value<string>>;
  constructor(properties: IPSet) {
    Object.assign(this, properties);
  }
}

export class IPSetReference {
  ReferenceArn?: Value<string>;
  constructor(properties: IPSetReference) {
    Object.assign(this, properties);
  }
}

export class MatchAttributes {
  Protocols?: List<Value<number>>;
  TCPFlags?: List<TCPFlagField>;
  DestinationPorts?: List<PortRange>;
  Destinations?: List<Address>;
  Sources?: List<Address>;
  SourcePorts?: List<PortRange>;
  constructor(properties: MatchAttributes) {
    Object.assign(this, properties);
  }
}

export class PortRange {
  FromPort!: Value<number>;
  ToPort!: Value<number>;
  constructor(properties: PortRange) {
    Object.assign(this, properties);
  }
}

export class PortSet {
  Definition?: List<Value<string>>;
  constructor(properties: PortSet) {
    Object.assign(this, properties);
  }
}

export class PublishMetricAction {
  Dimensions!: List<Dimension>;
  constructor(properties: PublishMetricAction) {
    Object.assign(this, properties);
  }
}

export class ReferenceSets {
  IPSetReferences?: { [key: string]: IPSetReference };
  constructor(properties: ReferenceSets) {
    Object.assign(this, properties);
  }
}

export class RuleDefinition {
  Actions!: List<Value<string>>;
  MatchAttributes!: MatchAttributes;
  constructor(properties: RuleDefinition) {
    Object.assign(this, properties);
  }
}

export class RuleGroupInner {
  StatefulRuleOptions?: StatefulRuleOptions;
  ReferenceSets?: ReferenceSets;
  RulesSource!: RulesSource;
  RuleVariables?: RuleVariables;
  constructor(properties: RuleGroupInner) {
    Object.assign(this, properties);
  }
}

export class RuleOption {
  Keyword!: Value<string>;
  Settings?: List<Value<string>>;
  constructor(properties: RuleOption) {
    Object.assign(this, properties);
  }
}

export class RuleVariables {
  PortSets?: { [key: string]: PortSet };
  IPSets?: { [key: string]: IPSet };
  constructor(properties: RuleVariables) {
    Object.assign(this, properties);
  }
}

export class RulesSource {
  StatelessRulesAndCustomActions?: StatelessRulesAndCustomActions;
  StatefulRules?: List<StatefulRule>;
  RulesString?: Value<string>;
  RulesSourceList?: RulesSourceList;
  constructor(properties: RulesSource) {
    Object.assign(this, properties);
  }
}

export class RulesSourceList {
  GeneratedRulesType!: Value<string>;
  TargetTypes!: List<Value<string>>;
  Targets!: List<Value<string>>;
  constructor(properties: RulesSourceList) {
    Object.assign(this, properties);
  }
}

export class StatefulRule {
  Action!: Value<string>;
  Header!: Header;
  RuleOptions!: List<RuleOption>;
  constructor(properties: StatefulRule) {
    Object.assign(this, properties);
  }
}

export class StatefulRuleOptions {
  RuleOrder?: Value<string>;
  constructor(properties: StatefulRuleOptions) {
    Object.assign(this, properties);
  }
}

export class StatelessRule {
  Priority!: Value<number>;
  RuleDefinition!: RuleDefinition;
  constructor(properties: StatelessRule) {
    Object.assign(this, properties);
  }
}

export class StatelessRulesAndCustomActions {
  StatelessRules!: List<StatelessRule>;
  CustomActions?: List<CustomAction>;
  constructor(properties: StatelessRulesAndCustomActions) {
    Object.assign(this, properties);
  }
}

export class SummaryConfiguration {
  RuleOptions?: List<Value<string>>;
  constructor(properties: SummaryConfiguration) {
    Object.assign(this, properties);
  }
}

export class TCPFlagField {
  Flags!: List<Value<string>>;
  Masks?: List<Value<string>>;
  constructor(properties: TCPFlagField) {
    Object.assign(this, properties);
  }
}
export interface RuleGroupProperties {
  Type: Value<string>;
  Description?: Value<string>;
  Capacity: Value<number>;
  RuleGroupName: Value<string>;
  SummaryConfiguration?: SummaryConfiguration;
  RuleGroup?: RuleGroup;
  Tags?: List<ResourceTag>;
}
export default class RuleGroup extends ResourceBase<RuleGroupProperties> {
  static ActionDefinition = ActionDefinition;
  static Address = Address;
  static CustomAction = CustomAction;
  static Dimension = Dimension;
  static Header = Header;
  static IPSet = IPSet;
  static IPSetReference = IPSetReference;
  static MatchAttributes = MatchAttributes;
  static PortRange = PortRange;
  static PortSet = PortSet;
  static PublishMetricAction = PublishMetricAction;
  static ReferenceSets = ReferenceSets;
  static RuleDefinition = RuleDefinition;
  static RuleGroup = RuleGroupInner;
  static RuleOption = RuleOption;
  static RuleVariables = RuleVariables;
  static RulesSource = RulesSource;
  static RulesSourceList = RulesSourceList;
  static StatefulRule = StatefulRule;
  static StatefulRuleOptions = StatefulRuleOptions;
  static StatelessRule = StatelessRule;
  static StatelessRulesAndCustomActions = StatelessRulesAndCustomActions;
  static SummaryConfiguration = SummaryConfiguration;
  static TCPFlagField = TCPFlagField;
  constructor(properties: RuleGroupProperties) {
    super('AWS::NetworkFirewall::RuleGroup', properties);
  }
}
