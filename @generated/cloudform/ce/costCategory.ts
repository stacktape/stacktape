import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourceTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ResourceTag) {
    Object.assign(this, properties);
  }
}
export interface CostCategoryProperties {
  DefaultValue?: Value<string>;
  SplitChargeRules?: Value<string>;
  RuleVersion: Value<string>;
  Rules: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class CostCategory extends ResourceBase<CostCategoryProperties> {
  static ResourceTag = ResourceTag;
  constructor(properties: CostCategoryProperties) {
    super('AWS::CE::CostCategory', properties);
  }
}
