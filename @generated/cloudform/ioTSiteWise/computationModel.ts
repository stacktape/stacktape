import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AnomalyDetectionComputationModelConfiguration {
  ResultProperty!: Value<string>;
  InputProperties!: Value<string>;
  constructor(properties: AnomalyDetectionComputationModelConfiguration) {
    Object.assign(this, properties);
  }
}

export class AssetModelPropertyBindingValue {
  AssetModelId!: Value<string>;
  PropertyId!: Value<string>;
  constructor(properties: AssetModelPropertyBindingValue) {
    Object.assign(this, properties);
  }
}

export class AssetPropertyBindingValue {
  AssetId!: Value<string>;
  PropertyId!: Value<string>;
  constructor(properties: AssetPropertyBindingValue) {
    Object.assign(this, properties);
  }
}

export class ComputationModelConfiguration {
  AnomalyDetection?: AnomalyDetectionComputationModelConfiguration;
  constructor(properties: ComputationModelConfiguration) {
    Object.assign(this, properties);
  }
}

export class ComputationModelDataBindingValue {
  AssetProperty?: AssetPropertyBindingValue;
  AssetModelProperty?: AssetModelPropertyBindingValue;
  List?: List<ComputationModelDataBindingValue>;
  constructor(properties: ComputationModelDataBindingValue) {
    Object.assign(this, properties);
  }
}
export interface ComputationModelProperties {
  ComputationModelConfiguration: ComputationModelConfiguration;
  ComputationModelDescription?: Value<string>;
  ComputationModelName: Value<string>;
  ComputationModelDataBinding: { [key: string]: ComputationModelDataBindingValue };
  Tags?: List<ResourceTag>;
}
export default class ComputationModel extends ResourceBase<ComputationModelProperties> {
  static AnomalyDetectionComputationModelConfiguration = AnomalyDetectionComputationModelConfiguration;
  static AssetModelPropertyBindingValue = AssetModelPropertyBindingValue;
  static AssetPropertyBindingValue = AssetPropertyBindingValue;
  static ComputationModelConfiguration = ComputationModelConfiguration;
  static ComputationModelDataBindingValue = ComputationModelDataBindingValue;
  constructor(properties: ComputationModelProperties) {
    super('AWS::IoTSiteWise::ComputationModel', properties);
  }
}
