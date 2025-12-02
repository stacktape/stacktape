import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AssociationData {
  KnowledgeBaseId!: Value<string>;
  constructor(properties: AssociationData) {
    Object.assign(this, properties);
  }
}
export interface AssistantAssociationProperties {
  Association: AssociationData;
  AssociationType: Value<string>;
  AssistantId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class AssistantAssociation extends ResourceBase<AssistantAssociationProperties> {
  static AssociationData = AssociationData;
  constructor(properties: AssistantAssociationProperties) {
    super('AWS::Wisdom::AssistantAssociation', properties);
  }
}
