import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  NoBid?: NoBidAction;
  HeaderTag?: HeaderTagAction;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class ApplicationLogs {
  LinkApplicationLogSampling!: LinkApplicationLogSampling;
  constructor(properties: ApplicationLogs) {
    Object.assign(this, properties);
  }
}

export class Filter {
  Criteria!: List<FilterCriterion>;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class FilterCriterion {
  Path!: Value<string>;
  Values!: List<Value<string>>;
  constructor(properties: FilterCriterion) {
    Object.assign(this, properties);
  }
}

export class HeaderTagAction {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: HeaderTagAction) {
    Object.assign(this, properties);
  }
}

export class LinkApplicationLogSampling {
  FilterLog!: Value<number>;
  ErrorLog!: Value<number>;
  constructor(properties: LinkApplicationLogSampling) {
    Object.assign(this, properties);
  }
}

export class LinkAttributes {
  ResponderErrorMasking?: List<ResponderErrorMaskingForHttpCode>;
  CustomerProvidedId?: Value<string>;
  constructor(properties: LinkAttributes) {
    Object.assign(this, properties);
  }
}

export class LinkLogSettings {
  ApplicationLogs!: ApplicationLogs;
  constructor(properties: LinkLogSettings) {
    Object.assign(this, properties);
  }
}

export class ModuleConfiguration {
  DependsOn?: List<Value<string>>;
  Version?: Value<string>;
  ModuleParameters?: ModuleParameters;
  Name!: Value<string>;
  constructor(properties: ModuleConfiguration) {
    Object.assign(this, properties);
  }
}

export class ModuleParameters {
  NoBid?: NoBidModuleParameters;
  OpenRtbAttribute?: OpenRtbAttributeModuleParameters;
  constructor(properties: ModuleParameters) {
    Object.assign(this, properties);
  }
}

export class NoBidAction {
  NoBidReasonCode?: Value<number>;
  constructor(properties: NoBidAction) {
    Object.assign(this, properties);
  }
}

export class NoBidModuleParameters {
  PassThroughPercentage?: Value<number>;
  ReasonCode?: Value<number>;
  Reason?: Value<string>;
  constructor(properties: NoBidModuleParameters) {
    Object.assign(this, properties);
  }
}

export class OpenRtbAttributeModuleParameters {
  FilterType!: Value<string>;
  Action!: Action;
  HoldbackPercentage!: Value<number>;
  FilterConfiguration!: List<Filter>;
  constructor(properties: OpenRtbAttributeModuleParameters) {
    Object.assign(this, properties);
  }
}

export class ResponderErrorMaskingForHttpCode {
  HttpCode!: Value<string>;
  Action!: Value<string>;
  ResponseLoggingPercentage?: Value<number>;
  LoggingTypes!: List<Value<string>>;
  constructor(properties: ResponderErrorMaskingForHttpCode) {
    Object.assign(this, properties);
  }
}
export interface LinkProperties {
  LinkAttributes?: LinkAttributes;
  ModuleConfigurationList?: List<ModuleConfiguration>;
  HttpResponderAllowed?: Value<boolean>;
  LinkLogSettings: LinkLogSettings;
  PeerGatewayId: Value<string>;
  GatewayId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Link extends ResourceBase<LinkProperties> {
  static Action = Action;
  static ApplicationLogs = ApplicationLogs;
  static Filter = Filter;
  static FilterCriterion = FilterCriterion;
  static HeaderTagAction = HeaderTagAction;
  static LinkApplicationLogSampling = LinkApplicationLogSampling;
  static LinkAttributes = LinkAttributes;
  static LinkLogSettings = LinkLogSettings;
  static ModuleConfiguration = ModuleConfiguration;
  static ModuleParameters = ModuleParameters;
  static NoBidAction = NoBidAction;
  static NoBidModuleParameters = NoBidModuleParameters;
  static OpenRtbAttributeModuleParameters = OpenRtbAttributeModuleParameters;
  static ResponderErrorMaskingForHttpCode = ResponderErrorMaskingForHttpCode;
  constructor(properties: LinkProperties) {
    super('AWS::RTBFabric::Link', properties);
  }
}
