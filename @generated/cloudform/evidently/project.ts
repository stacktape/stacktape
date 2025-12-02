import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AppConfigResourceObject {
  EnvironmentId!: Value<string>;
  ApplicationId!: Value<string>;
  constructor(properties: AppConfigResourceObject) {
    Object.assign(this, properties);
  }
}

export class DataDeliveryObject {
  S3?: S3Destination;
  LogGroup?: Value<string>;
  constructor(properties: DataDeliveryObject) {
    Object.assign(this, properties);
  }
}

export class S3Destination {
  BucketName!: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: S3Destination) {
    Object.assign(this, properties);
  }
}
export interface ProjectProperties {
  DataDelivery?: DataDeliveryObject;
  Description?: Value<string>;
  AppConfigResource?: AppConfigResourceObject;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Project extends ResourceBase<ProjectProperties> {
  static AppConfigResourceObject = AppConfigResourceObject;
  static DataDeliveryObject = DataDeliveryObject;
  static S3Destination = S3Destination;
  constructor(properties: ProjectProperties) {
    super('AWS::Evidently::Project', properties);
  }
}
