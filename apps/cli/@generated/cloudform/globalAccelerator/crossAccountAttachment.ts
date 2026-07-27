import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Resource {
  Cidr?: Value<string>;
  EndpointId?: Value<string>;
  Region?: Value<string>;
  constructor(properties: Resource) {
    Object.assign(this, properties);
  }
}
export interface CrossAccountAttachmentProperties {
  Principals?: List<Value<string>>;
  Resources?: List<Resource>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class CrossAccountAttachment extends ResourceBase<CrossAccountAttachmentProperties> {
  static Resource = Resource;
  constructor(properties: CrossAccountAttachmentProperties) {
    super('AWS::GlobalAccelerator::CrossAccountAttachment', properties);
  }
}
