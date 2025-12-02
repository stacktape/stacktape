import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataQuery {
  TableConfigurations?: { [key: string]: any };
  QueryStatement!: Value<string>;
  constructor(properties: DataQuery) {
    Object.assign(this, properties);
  }
}

export class DestinationConfigurations {
  S3Destination!: S3Destination;
  constructor(properties: DestinationConfigurations) {
    Object.assign(this, properties);
  }
}

export class ExportInner {
  Description?: Value<string>;
  RefreshCadence!: RefreshCadence;
  ExportArn?: Value<string>;
  DataQuery!: DataQuery;
  DestinationConfigurations!: DestinationConfigurations;
  Name!: Value<string>;
  constructor(properties: ExportInner) {
    Object.assign(this, properties);
  }
}

export class RefreshCadence {
  Frequency!: Value<string>;
  constructor(properties: RefreshCadence) {
    Object.assign(this, properties);
  }
}

export class ResourceTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ResourceTag) {
    Object.assign(this, properties);
  }
}

export class S3Destination {
  S3Bucket!: Value<string>;
  S3OutputConfigurations!: S3OutputConfigurations;
  S3Region!: Value<string>;
  S3Prefix!: Value<string>;
  constructor(properties: S3Destination) {
    Object.assign(this, properties);
  }
}

export class S3OutputConfigurations {
  Compression!: Value<string>;
  Overwrite!: Value<string>;
  Format!: Value<string>;
  OutputType!: Value<string>;
  constructor(properties: S3OutputConfigurations) {
    Object.assign(this, properties);
  }
}
export interface ExportProperties {
  Export: Export;
  Tags?: List<ResourceTag>;
}
export default class Export extends ResourceBase<ExportProperties> {
  static DataQuery = DataQuery;
  static DestinationConfigurations = DestinationConfigurations;
  static Export = ExportInner;
  static RefreshCadence = RefreshCadence;
  static ResourceTag = ResourceTag;
  static S3Destination = S3Destination;
  static S3OutputConfigurations = S3OutputConfigurations;
  constructor(properties: ExportProperties) {
    super('AWS::BCMDataExports::Export', properties);
  }
}
