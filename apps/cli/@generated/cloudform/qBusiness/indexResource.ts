import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DocumentAttributeConfiguration {
  Type?: Value<string>;
  Search?: Value<string>;
  Name?: Value<string>;
  constructor(properties: DocumentAttributeConfiguration) {
    Object.assign(this, properties);
  }
}

export class IndexCapacityConfiguration {
  Units?: Value<number>;
  constructor(properties: IndexCapacityConfiguration) {
    Object.assign(this, properties);
  }
}

export class IndexStatistics {
  TextDocumentStatistics?: TextDocumentStatistics;
  constructor(properties: IndexStatistics) {
    Object.assign(this, properties);
  }
}

export class TextDocumentStatistics {
  IndexedTextBytes?: Value<number>;
  IndexedTextDocumentCount?: Value<number>;
  constructor(properties: TextDocumentStatistics) {
    Object.assign(this, properties);
  }
}
export interface IndexProperties {
  Type?: Value<string>;
  Description?: Value<string>;
  DisplayName: Value<string>;
  DocumentAttributeConfigurations?: List<DocumentAttributeConfiguration>;
  ApplicationId: Value<string>;
  Tags?: List<ResourceTag>;
  CapacityConfiguration?: IndexCapacityConfiguration;
}
export default class Index extends ResourceBase<IndexProperties> {
  static DocumentAttributeConfiguration = DocumentAttributeConfiguration;
  static IndexCapacityConfiguration = IndexCapacityConfiguration;
  static IndexStatistics = IndexStatistics;
  static TextDocumentStatistics = TextDocumentStatistics;
  constructor(properties: IndexProperties) {
    super('AWS::QBusiness::Index', properties);
  }
}
