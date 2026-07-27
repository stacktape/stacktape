import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutomationRulesActionV2 {
  Type!: Value<string>;
  ExternalIntegrationConfiguration?: ExternalIntegrationConfiguration;
  FindingFieldsUpdate?: AutomationRulesFindingFieldsUpdateV2;
  constructor(properties: AutomationRulesActionV2) {
    Object.assign(this, properties);
  }
}

export class AutomationRulesFindingFieldsUpdateV2 {
  Comment?: Value<string>;
  StatusId?: Value<number>;
  SeverityId?: Value<number>;
  constructor(properties: AutomationRulesFindingFieldsUpdateV2) {
    Object.assign(this, properties);
  }
}

export class BooleanFilter {
  Value!: Value<boolean>;
  constructor(properties: BooleanFilter) {
    Object.assign(this, properties);
  }
}

export class CompositeFilter {
  Operator?: Value<string>;
  StringFilters?: List<OcsfStringFilter>;
  BooleanFilters?: List<OcsfBooleanFilter>;
  DateFilters?: List<OcsfDateFilter>;
  NumberFilters?: List<OcsfNumberFilter>;
  MapFilters?: List<OcsfMapFilter>;
  constructor(properties: CompositeFilter) {
    Object.assign(this, properties);
  }
}

export class Criteria {
  OcsfFindingCriteria?: OcsfFindingFilters;
  constructor(properties: Criteria) {
    Object.assign(this, properties);
  }
}

export class DateFilter {
  DateRange?: DateRange;
  Start?: Value<string>;
  End?: Value<string>;
  constructor(properties: DateFilter) {
    Object.assign(this, properties);
  }
}

export class DateRange {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: DateRange) {
    Object.assign(this, properties);
  }
}

export class ExternalIntegrationConfiguration {
  ConnectorArn?: Value<string>;
  constructor(properties: ExternalIntegrationConfiguration) {
    Object.assign(this, properties);
  }
}

export class MapFilter {
  Comparison!: Value<string>;
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: MapFilter) {
    Object.assign(this, properties);
  }
}

export class NumberFilter {
  Gte?: Value<number>;
  Eq?: Value<number>;
  Lte?: Value<number>;
  constructor(properties: NumberFilter) {
    Object.assign(this, properties);
  }
}

export class OcsfBooleanFilter {
  Filter!: BooleanFilter;
  FieldName!: Value<string>;
  constructor(properties: OcsfBooleanFilter) {
    Object.assign(this, properties);
  }
}

export class OcsfDateFilter {
  Filter!: DateFilter;
  FieldName!: Value<string>;
  constructor(properties: OcsfDateFilter) {
    Object.assign(this, properties);
  }
}

export class OcsfFindingFilters {
  CompositeFilters?: List<CompositeFilter>;
  CompositeOperator?: Value<string>;
  constructor(properties: OcsfFindingFilters) {
    Object.assign(this, properties);
  }
}

export class OcsfMapFilter {
  Filter!: MapFilter;
  FieldName!: Value<string>;
  constructor(properties: OcsfMapFilter) {
    Object.assign(this, properties);
  }
}

export class OcsfNumberFilter {
  Filter!: NumberFilter;
  FieldName!: Value<string>;
  constructor(properties: OcsfNumberFilter) {
    Object.assign(this, properties);
  }
}

export class OcsfStringFilter {
  Filter!: StringFilter;
  FieldName!: Value<string>;
  constructor(properties: OcsfStringFilter) {
    Object.assign(this, properties);
  }
}

export class StringFilter {
  Comparison!: Value<string>;
  Value!: Value<string>;
  constructor(properties: StringFilter) {
    Object.assign(this, properties);
  }
}
export interface AutomationRuleV2Properties {
  Description: Value<string>;
  Actions: List<AutomationRulesActionV2>;
  RuleStatus?: Value<string>;
  Criteria: Criteria;
  RuleOrder: Value<number>;
  RuleName: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class AutomationRuleV2 extends ResourceBase<AutomationRuleV2Properties> {
  static AutomationRulesActionV2 = AutomationRulesActionV2;
  static AutomationRulesFindingFieldsUpdateV2 = AutomationRulesFindingFieldsUpdateV2;
  static BooleanFilter = BooleanFilter;
  static CompositeFilter = CompositeFilter;
  static Criteria = Criteria;
  static DateFilter = DateFilter;
  static DateRange = DateRange;
  static ExternalIntegrationConfiguration = ExternalIntegrationConfiguration;
  static MapFilter = MapFilter;
  static NumberFilter = NumberFilter;
  static OcsfBooleanFilter = OcsfBooleanFilter;
  static OcsfDateFilter = OcsfDateFilter;
  static OcsfFindingFilters = OcsfFindingFilters;
  static OcsfMapFilter = OcsfMapFilter;
  static OcsfNumberFilter = OcsfNumberFilter;
  static OcsfStringFilter = OcsfStringFilter;
  static StringFilter = StringFilter;
  constructor(properties: AutomationRuleV2Properties) {
    super('AWS::SecurityHub::AutomationRuleV2', properties);
  }
}
