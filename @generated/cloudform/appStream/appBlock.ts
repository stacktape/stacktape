import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class S3Location {
  S3Bucket!: Value<string>;
  S3Key?: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class ScriptDetails {
  TimeoutInSeconds!: Value<number>;
  ScriptS3Location!: S3Location;
  ExecutablePath!: Value<string>;
  ExecutableParameters?: Value<string>;
  constructor(properties: ScriptDetails) {
    Object.assign(this, properties);
  }
}
export interface AppBlockProperties {
  SetupScriptDetails?: ScriptDetails;
  Description?: Value<string>;
  PostSetupScriptDetails?: ScriptDetails;
  DisplayName?: Value<string>;
  SourceS3Location: S3Location;
  Tags?: List<ResourceTag>;
  PackagingType?: Value<string>;
  Name: Value<string>;
}
export default class AppBlock extends ResourceBase<AppBlockProperties> {
  static S3Location = S3Location;
  static ScriptDetails = ScriptDetails;
  constructor(properties: AppBlockProperties) {
    super('AWS::AppStream::AppBlock', properties);
  }
}
