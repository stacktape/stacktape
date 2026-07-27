import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DatasetSource {
  SourceType!: Value<string>;
  SourceFormat!: Value<string>;
  SourceDetail?: SourceDetail;
  constructor(properties: DatasetSource) {
    Object.assign(this, properties);
  }
}

export class KendraSourceDetail {
  KnowledgeBaseArn!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: KendraSourceDetail) {
    Object.assign(this, properties);
  }
}

export class SourceDetail {
  Kendra?: KendraSourceDetail;
  constructor(properties: SourceDetail) {
    Object.assign(this, properties);
  }
}
export interface DatasetProperties {
  DatasetName: Value<string>;
  DatasetSource: DatasetSource;
  DatasetDescription?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Dataset extends ResourceBase<DatasetProperties> {
  static DatasetSource = DatasetSource;
  static KendraSourceDetail = KendraSourceDetail;
  static SourceDetail = SourceDetail;
  constructor(properties: DatasetProperties) {
    super('AWS::IoTSiteWise::Dataset', properties);
  }
}
