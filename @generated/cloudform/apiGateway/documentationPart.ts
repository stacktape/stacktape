import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Location {
  Path?: Value<string>;
  Type?: Value<string>;
  Method?: Value<string>;
  StatusCode?: Value<string>;
  Name?: Value<string>;
  constructor(properties: Location) {
    Object.assign(this, properties);
  }
}
export interface DocumentationPartProperties {
  RestApiId: Value<string>;
  Properties: Value<string>;
  Location: Location;
}
export default class DocumentationPart extends ResourceBase<DocumentationPartProperties> {
  static Location = Location;
  constructor(properties: DocumentationPartProperties) {
    super('AWS::ApiGateway::DocumentationPart', properties);
  }
}
