import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttachmentsSource {
  Values?: List<Value<string>>;
  Key?: Value<string>;
  Name?: Value<string>;
  constructor(properties: AttachmentsSource) {
    Object.assign(this, properties);
  }
}

export class DocumentRequires {
  Version?: Value<string>;
  Name?: Value<string>;
  constructor(properties: DocumentRequires) {
    Object.assign(this, properties);
  }
}
export interface DocumentProperties {
  DocumentFormat?: Value<string>;
  Requires?: List<DocumentRequires>;
  Content: { [key: string]: any };
  TargetType?: Value<string>;
  DocumentType?: Value<string>;
  VersionName?: Value<string>;
  UpdateMethod?: Value<string>;
  Attachments?: List<AttachmentsSource>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Document extends ResourceBase<DocumentProperties> {
  static AttachmentsSource = AttachmentsSource;
  static DocumentRequires = DocumentRequires;
  constructor(properties: DocumentProperties) {
    super('AWS::SSM::Document', properties);
  }
}
