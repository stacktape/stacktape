import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class SourceApiAssociationConfig {
  MergeType?: Value<string>;
  constructor(properties: SourceApiAssociationConfig) {
    Object.assign(this, properties);
  }
}
export interface SourceApiAssociationProperties {
  Description?: Value<string>;
  SourceApiAssociationConfig?: SourceApiAssociationConfig;
  MergedApiIdentifier?: Value<string>;
  SourceApiIdentifier?: Value<string>;
}
export default class SourceApiAssociation extends ResourceBase<SourceApiAssociationProperties> {
  static SourceApiAssociationConfig = SourceApiAssociationConfig;
  constructor(properties?: SourceApiAssociationProperties) {
    super('AWS::AppSync::SourceApiAssociation', properties || {});
  }
}
