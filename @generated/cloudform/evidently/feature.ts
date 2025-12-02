import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EntityOverride {
  EntityId?: Value<string>;
  Variation?: Value<string>;
  constructor(properties: EntityOverride) {
    Object.assign(this, properties);
  }
}

export class VariationObject {
  VariationName!: Value<string>;
  DoubleValue?: Value<number>;
  BooleanValue?: Value<boolean>;
  LongValue?: Value<number>;
  StringValue?: Value<string>;
  constructor(properties: VariationObject) {
    Object.assign(this, properties);
  }
}
export interface FeatureProperties {
  Project: Value<string>;
  Description?: Value<string>;
  EvaluationStrategy?: Value<string>;
  DefaultVariation?: Value<string>;
  EntityOverrides?: List<EntityOverride>;
  Variations: List<VariationObject>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Feature extends ResourceBase<FeatureProperties> {
  static EntityOverride = EntityOverride;
  static VariationObject = VariationObject;
  constructor(properties: FeatureProperties) {
    super('AWS::Evidently::Feature', properties);
  }
}
