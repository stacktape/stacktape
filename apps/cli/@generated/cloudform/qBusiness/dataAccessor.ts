import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ActionConfiguration {
  Action!: Value<string>;
  FilterConfiguration?: ActionFilterConfiguration;
  constructor(properties: ActionConfiguration) {
    Object.assign(this, properties);
  }
}

export class ActionFilterConfiguration {
  DocumentAttributeFilter!: AttributeFilter;
  constructor(properties: ActionFilterConfiguration) {
    Object.assign(this, properties);
  }
}

export class AttributeFilter {
  ContainsAny?: DocumentAttribute;
  LessThan?: DocumentAttribute;
  GreaterThan?: DocumentAttribute;
  NotFilter?: AttributeFilter;
  LessThanOrEquals?: DocumentAttribute;
  OrAllFilters?: List<AttributeFilter>;
  EqualsTo?: DocumentAttribute;
  GreaterThanOrEquals?: DocumentAttribute;
  AndAllFilters?: List<AttributeFilter>;
  ContainsAll?: DocumentAttribute;
  constructor(properties: AttributeFilter) {
    Object.assign(this, properties);
  }
}

export class DataAccessorAuthenticationConfiguration {
  IdcTrustedTokenIssuerConfiguration!: DataAccessorIdcTrustedTokenIssuerConfiguration;
  constructor(properties: DataAccessorAuthenticationConfiguration) {
    Object.assign(this, properties);
  }
}

export class DataAccessorAuthenticationDetail {
  AuthenticationConfiguration?: DataAccessorAuthenticationConfiguration;
  ExternalIds?: List<Value<string>>;
  AuthenticationType!: Value<string>;
  constructor(properties: DataAccessorAuthenticationDetail) {
    Object.assign(this, properties);
  }
}

export class DataAccessorIdcTrustedTokenIssuerConfiguration {
  IdcTrustedTokenIssuerArn!: Value<string>;
  constructor(properties: DataAccessorIdcTrustedTokenIssuerConfiguration) {
    Object.assign(this, properties);
  }
}

export class DocumentAttribute {
  Value!: DocumentAttributeValue;
  Name!: Value<string>;
  constructor(properties: DocumentAttribute) {
    Object.assign(this, properties);
  }
}

export class DocumentAttributeValue {
  DateValue?: Value<string>;
  LongValue?: Value<number>;
  StringValue?: Value<string>;
  StringListValue?: List<Value<string>>;
  constructor(properties: DocumentAttributeValue) {
    Object.assign(this, properties);
  }
}
export interface DataAccessorProperties {
  DisplayName: Value<string>;
  ActionConfigurations: List<ActionConfiguration>;
  ApplicationId: Value<string>;
  Principal: Value<string>;
  Tags?: List<ResourceTag>;
  AuthenticationDetail?: DataAccessorAuthenticationDetail;
}
export default class DataAccessor extends ResourceBase<DataAccessorProperties> {
  static ActionConfiguration = ActionConfiguration;
  static ActionFilterConfiguration = ActionFilterConfiguration;
  static AttributeFilter = AttributeFilter;
  static DataAccessorAuthenticationConfiguration = DataAccessorAuthenticationConfiguration;
  static DataAccessorAuthenticationDetail = DataAccessorAuthenticationDetail;
  static DataAccessorIdcTrustedTokenIssuerConfiguration = DataAccessorIdcTrustedTokenIssuerConfiguration;
  static DocumentAttribute = DocumentAttribute;
  static DocumentAttributeValue = DocumentAttributeValue;
  constructor(properties: DataAccessorProperties) {
    super('AWS::QBusiness::DataAccessor', properties);
  }
}
