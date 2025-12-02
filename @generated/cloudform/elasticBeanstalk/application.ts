import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ApplicationResourceLifecycleConfig {
  ServiceRole?: Value<string>;
  VersionLifecycleConfig?: ApplicationVersionLifecycleConfig;
  constructor(properties: ApplicationResourceLifecycleConfig) {
    Object.assign(this, properties);
  }
}

export class ApplicationVersionLifecycleConfig {
  MaxCountRule?: MaxCountRule;
  MaxAgeRule?: MaxAgeRule;
  constructor(properties: ApplicationVersionLifecycleConfig) {
    Object.assign(this, properties);
  }
}

export class MaxAgeRule {
  DeleteSourceFromS3?: Value<boolean>;
  MaxAgeInDays?: Value<number>;
  Enabled?: Value<boolean>;
  constructor(properties: MaxAgeRule) {
    Object.assign(this, properties);
  }
}

export class MaxCountRule {
  DeleteSourceFromS3?: Value<boolean>;
  Enabled?: Value<boolean>;
  MaxCount?: Value<number>;
  constructor(properties: MaxCountRule) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  ApplicationName?: Value<string>;
  Description?: Value<string>;
  ResourceLifecycleConfig?: ApplicationResourceLifecycleConfig;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static ApplicationResourceLifecycleConfig = ApplicationResourceLifecycleConfig;
  static ApplicationVersionLifecycleConfig = ApplicationVersionLifecycleConfig;
  static MaxAgeRule = MaxAgeRule;
  static MaxCountRule = MaxCountRule;
  constructor(properties?: ApplicationProperties) {
    super('AWS::ElasticBeanstalk::Application', properties || {});
  }
}
