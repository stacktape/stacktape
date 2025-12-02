import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DefinitionDocument {
  Language!: Value<string>;
  Text!: Value<string>;
  constructor(properties: DefinitionDocument) {
    Object.assign(this, properties);
  }
}
export interface FlowTemplateProperties {
  CompatibleNamespaceVersion?: Value<number>;
  Definition: DefinitionDocument;
}
export default class FlowTemplate extends ResourceBase<FlowTemplateProperties> {
  static DefinitionDocument = DefinitionDocument;
  constructor(properties: FlowTemplateProperties) {
    super('AWS::IoTThingsGraph::FlowTemplate', properties);
  }
}
