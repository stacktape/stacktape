import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SourceProcessingProperties {
  RoleArn!: Value<string>;
  constructor(properties: SourceProcessingProperties) {
    Object.assign(this, properties);
  }
}

export class TargetProcessingProperties {
  ConnectionName?: Value<string>;
  KmsArn?: Value<string>;
  RoleArn!: Value<string>;
  EventBusArn?: Value<string>;
  constructor(properties: TargetProcessingProperties) {
    Object.assign(this, properties);
  }
}
export interface IntegrationResourcePropertyProperties {
  ResourceArn: Value<string>;
  TargetProcessingProperties?: TargetProcessingProperties;
  SourceProcessingProperties?: SourceProcessingProperties;
  Tags?: List<ResourceTag>;
}
export default class IntegrationResourceProperty extends ResourceBase<IntegrationResourcePropertyProperties> {
  static SourceProcessingProperties = SourceProcessingProperties;
  static TargetProcessingProperties = TargetProcessingProperties;
  constructor(properties: IntegrationResourcePropertyProperties) {
    super('AWS::Glue::IntegrationResourceProperty', properties);
  }
}
