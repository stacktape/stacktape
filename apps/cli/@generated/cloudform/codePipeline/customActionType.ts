import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ArtifactDetails {
  MinimumCount!: Value<number>;
  MaximumCount!: Value<number>;
  constructor(properties: ArtifactDetails) {
    Object.assign(this, properties);
  }
}

export class ConfigurationProperties {
  Secret!: Value<boolean>;
  Type?: Value<string>;
  Description?: Value<string>;
  Required!: Value<boolean>;
  Queryable?: Value<boolean>;
  Key!: Value<boolean>;
  Name!: Value<string>;
  constructor(properties: ConfigurationProperties) {
    Object.assign(this, properties);
  }
}

export class Settings {
  EntityUrlTemplate?: Value<string>;
  ExecutionUrlTemplate?: Value<string>;
  RevisionUrlTemplate?: Value<string>;
  ThirdPartyConfigurationUrl?: Value<string>;
  constructor(properties: Settings) {
    Object.assign(this, properties);
  }
}
export interface CustomActionTypeProperties {
  Category: Value<string>;
  InputArtifactDetails: ArtifactDetails;
  Version: Value<string>;
  OutputArtifactDetails: ArtifactDetails;
  ConfigurationProperties?: List<ConfigurationProperties>;
  Settings?: Settings;
  Tags?: List<ResourceTag>;
  Provider: Value<string>;
}
export default class CustomActionType extends ResourceBase<CustomActionTypeProperties> {
  static ArtifactDetails = ArtifactDetails;
  static ConfigurationProperties = ConfigurationProperties;
  static Settings = Settings;
  constructor(properties: CustomActionTypeProperties) {
    super('AWS::CodePipeline::CustomActionType', properties);
  }
}
