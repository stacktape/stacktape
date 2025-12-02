import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AppConfig {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: AppConfig) {
    Object.assign(this, properties);
  }
}

export class DataSource {
  DataSourceArn!: Value<string>;
  DataSourceDescription?: Value<string>;
  constructor(properties: DataSource) {
    Object.assign(this, properties);
  }
}

export class IamIdentityCenterOptions {
  IamIdentityCenterInstanceArn?: Value<string>;
  IamRoleForIdentityCenterApplicationArn?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: IamIdentityCenterOptions) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  DataSources?: List<DataSource>;
  AppConfigs?: List<AppConfig>;
  Endpoint?: Value<string>;
  Tags?: List<ResourceTag>;
  IamIdentityCenterOptions?: IamIdentityCenterOptions;
  Name: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static AppConfig = AppConfig;
  static DataSource = DataSource;
  static IamIdentityCenterOptions = IamIdentityCenterOptions;
  constructor(properties: ApplicationProperties) {
    super('AWS::OpenSearchService::Application', properties);
  }
}
