import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Backend {
  StackArn?: Value<string>;
  constructor(properties: Backend) {
    Object.assign(this, properties);
  }
}

export class BasicAuthConfig {
  Username!: Value<string>;
  EnableBasicAuth?: Value<boolean>;
  Password!: Value<string>;
  constructor(properties: BasicAuthConfig) {
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
export interface BranchProperties {
  Description?: Value<string>;
  EnablePerformanceMode?: Value<boolean>;
  ComputeRoleArn?: Value<string>;
  Backend?: Backend;
  EnvironmentVariables?: List<EnvironmentVariable>;
  AppId: Value<string>;
  PullRequestEnvironmentName?: Value<string>;
  EnablePullRequestPreview?: Value<boolean>;
  EnableSkewProtection?: Value<boolean>;
  EnableAutoBuild?: Value<boolean>;
  BuildSpec?: Value<string>;
  Stage?: Value<string>;
  BranchName: Value<string>;
  BasicAuthConfig?: BasicAuthConfig;
  Framework?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Branch extends ResourceBase<BranchProperties> {
  static Backend = Backend;
  static BasicAuthConfig = BasicAuthConfig;
  static EnvironmentVariable = EnvironmentVariable;
  constructor(properties: BranchProperties) {
    super('AWS::Amplify::Branch', properties);
  }
}
