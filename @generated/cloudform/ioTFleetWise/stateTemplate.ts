import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface StateTemplateProperties {
  StateTemplateProperties: List<Value<string>>;
  Description?: Value<string>;
  DataExtraDimensions?: List<Value<string>>;
  SignalCatalogArn: Value<string>;
  MetadataExtraDimensions?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class StateTemplate extends ResourceBase<StateTemplateProperties> {
  constructor(properties: StateTemplateProperties) {
    super('AWS::IoTFleetWise::StateTemplate', properties);
  }
}
