import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DocumentationVersionProperties {
  Description?: Value<string>;
  DocumentationVersion: Value<string>;
  RestApiId: Value<string>;
}
export default class DocumentationVersion extends ResourceBase<DocumentationVersionProperties> {
  constructor(properties: DocumentationVersionProperties) {
    super('AWS::ApiGateway::DocumentationVersion', properties);
  }
}
