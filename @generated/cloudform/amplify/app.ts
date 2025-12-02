import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoBranchCreationConfig {
  EnvironmentVariables?: List<EnvironmentVariable>;
  AutoBranchCreationPatterns?: List<Value<string>>;
  EnableAutoBranchCreation?: Value<boolean>;
  PullRequestEnvironmentName?: Value<string>;
  EnablePullRequestPreview?: Value<boolean>;
  EnableAutoBuild?: Value<boolean>;
  EnablePerformanceMode?: Value<boolean>;
  BuildSpec?: Value<string>;
  Stage?: Value<string>;
  BasicAuthConfig?: BasicAuthConfig;
  Framework?: Value<string>;
  constructor(properties: AutoBranchCreationConfig) {
    Object.assign(this, properties);
  }
}

export class BasicAuthConfig {
  Username?: Value<string>;
  EnableBasicAuth?: Value<boolean>;
  Password?: Value<string>;
  constructor(properties: BasicAuthConfig) {
    Object.assign(this, properties);
  }
}

export class CacheConfig {
  Type?: Value<string>;
  constructor(properties: CacheConfig) {
    Object.assign(this, properties);
  }
}

export class CustomRule {
  Condition?: Value<string>;
  Status?: Value<string>;
  Target!: Value<string>;
  Source!: Value<string>;
  constructor(properties: CustomRule) {
    Object.assign(this, properties);
  }
}

export class EnvironmentVariable {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: EnvironmentVariable) {
    Object.assign(this, properties);
  }
}

export class JobConfig {
  BuildComputeType!: Value<string>;
  constructor(properties: JobConfig) {
    Object.assign(this, properties);
  }
}
export interface AppProperties {
  AutoBranchCreationConfig?: AutoBranchCreationConfig;
  OauthToken?: Value<string>;
  Description?: Value<string>;
  Platform?: Value<string>;
  EnableBranchAutoDeletion?: Value<boolean>;
  JobConfig?: JobConfig;
  Name: Value<string>;
  ComputeRoleArn?: Value<string>;
  Repository?: Value<string>;
  EnvironmentVariables?: List<EnvironmentVariable>;
  AccessToken?: Value<string>;
  BuildSpec?: Value<string>;
  CustomRules?: List<CustomRule>;
  BasicAuthConfig?: BasicAuthConfig;
  CacheConfig?: CacheConfig;
  CustomHeaders?: Value<string>;
  Tags?: List<ResourceTag>;
  IAMServiceRole?: Value<string>;
}
export default class App extends ResourceBase<AppProperties> {
  static AutoBranchCreationConfig = AutoBranchCreationConfig;
  static BasicAuthConfig = BasicAuthConfig;
  static CacheConfig = CacheConfig;
  static CustomRule = CustomRule;
  static EnvironmentVariable = EnvironmentVariable;
  static JobConfig = JobConfig;
  constructor(properties: AppProperties) {
    super('AWS::Amplify::App', properties);
  }
}
