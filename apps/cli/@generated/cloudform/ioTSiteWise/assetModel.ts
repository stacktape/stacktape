import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AssetModelCompositeModel {
  Path?: List<Value<string>>;
  ParentAssetModelCompositeModelExternalId?: Value<string>;
  Type!: Value<string>;
  Description?: Value<string>;
  ComposedAssetModelId?: Value<string>;
  ExternalId?: Value<string>;
  CompositeModelProperties?: List<AssetModelProperty>;
  Id?: Value<string>;
  Name!: Value<string>;
  constructor(properties: AssetModelCompositeModel) {
    Object.assign(this, properties);
  }
}

export class AssetModelHierarchy {
  LogicalId?: Value<string>;
  ExternalId?: Value<string>;
  Id?: Value<string>;
  ChildAssetModelId!: Value<string>;
  Name!: Value<string>;
  constructor(properties: AssetModelHierarchy) {
    Object.assign(this, properties);
  }
}

export class AssetModelProperty {
  Type!: PropertyType;
  LogicalId?: Value<string>;
  ExternalId?: Value<string>;
  DataTypeSpec?: Value<string>;
  DataType!: Value<string>;
  Id?: Value<string>;
  Unit?: Value<string>;
  Name!: Value<string>;
  constructor(properties: AssetModelProperty) {
    Object.assign(this, properties);
  }
}

export class Attribute {
  DefaultValue?: Value<string>;
  constructor(properties: Attribute) {
    Object.assign(this, properties);
  }
}

export class EnforcedAssetModelInterfacePropertyMapping {
  InterfaceAssetModelPropertyExternalId!: Value<string>;
  AssetModelPropertyLogicalId?: Value<string>;
  AssetModelPropertyExternalId?: Value<string>;
  constructor(properties: EnforcedAssetModelInterfacePropertyMapping) {
    Object.assign(this, properties);
  }
}

export class EnforcedAssetModelInterfaceRelationship {
  InterfaceAssetModelId?: Value<string>;
  PropertyMappings?: List<EnforcedAssetModelInterfacePropertyMapping>;
  constructor(properties: EnforcedAssetModelInterfaceRelationship) {
    Object.assign(this, properties);
  }
}

export class ExpressionVariable {
  Value!: VariableValue;
  Name!: Value<string>;
  constructor(properties: ExpressionVariable) {
    Object.assign(this, properties);
  }
}

export class Metric {
  Variables!: List<ExpressionVariable>;
  Window!: MetricWindow;
  Expression!: Value<string>;
  constructor(properties: Metric) {
    Object.assign(this, properties);
  }
}

export class MetricWindow {
  Tumbling?: TumblingWindow;
  constructor(properties: MetricWindow) {
    Object.assign(this, properties);
  }
}

export class PropertyPathDefinition {
  Name!: Value<string>;
  constructor(properties: PropertyPathDefinition) {
    Object.assign(this, properties);
  }
}

export class PropertyType {
  TypeName!: Value<string>;
  Attribute?: Attribute;
  Metric?: Metric;
  Transform?: Transform;
  constructor(properties: PropertyType) {
    Object.assign(this, properties);
  }
}

export class Transform {
  Variables!: List<ExpressionVariable>;
  Expression!: Value<string>;
  constructor(properties: Transform) {
    Object.assign(this, properties);
  }
}

export class TumblingWindow {
  Interval!: Value<string>;
  Offset?: Value<string>;
  constructor(properties: TumblingWindow) {
    Object.assign(this, properties);
  }
}

export class VariableValue {
  PropertyExternalId?: Value<string>;
  HierarchyId?: Value<string>;
  PropertyLogicalId?: Value<string>;
  HierarchyLogicalId?: Value<string>;
  PropertyPath?: List<PropertyPathDefinition>;
  HierarchyExternalId?: Value<string>;
  PropertyId?: Value<string>;
  constructor(properties: VariableValue) {
    Object.assign(this, properties);
  }
}
export interface AssetModelProperties {
  AssetModelDescription?: Value<string>;
  AssetModelCompositeModels?: List<AssetModelCompositeModel>;
  EnforcedAssetModelInterfaceRelationships?: List<EnforcedAssetModelInterfaceRelationship>;
  AssetModelType?: Value<string>;
  AssetModelName: Value<string>;
  AssetModelHierarchies?: List<AssetModelHierarchy>;
  AssetModelProperties?: List<AssetModelProperty>;
  AssetModelExternalId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class AssetModel extends ResourceBase<AssetModelProperties> {
  static AssetModelCompositeModel = AssetModelCompositeModel;
  static AssetModelHierarchy = AssetModelHierarchy;
  static AssetModelProperty = AssetModelProperty;
  static Attribute = Attribute;
  static EnforcedAssetModelInterfacePropertyMapping = EnforcedAssetModelInterfacePropertyMapping;
  static EnforcedAssetModelInterfaceRelationship = EnforcedAssetModelInterfaceRelationship;
  static ExpressionVariable = ExpressionVariable;
  static Metric = Metric;
  static MetricWindow = MetricWindow;
  static PropertyPathDefinition = PropertyPathDefinition;
  static PropertyType = PropertyType;
  static Transform = Transform;
  static TumblingWindow = TumblingWindow;
  static VariableValue = VariableValue;
  constructor(properties: AssetModelProperties) {
    super('AWS::IoTSiteWise::AssetModel', properties);
  }
}
