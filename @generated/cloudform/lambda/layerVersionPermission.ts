import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface LayerVersionPermissionProperties {
  Action: Value<string>;
  LayerVersionArn: Value<string>;
  OrganizationId?: Value<string>;
  Principal: Value<string>;
}
export default class LayerVersionPermission extends ResourceBase<LayerVersionPermissionProperties> {
  constructor(properties: LayerVersionPermissionProperties) {
    super('AWS::Lambda::LayerVersionPermission', properties);
  }
}
