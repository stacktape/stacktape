import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PeriodicStateTemplateUpdateStrategy {
  StateTemplateUpdateRate!: TimePeriod;
  constructor(properties: PeriodicStateTemplateUpdateStrategy) {
    Object.assign(this, properties);
  }
}

export class StateTemplateAssociation {
  Identifier!: Value<string>;
  StateTemplateUpdateStrategy!: StateTemplateUpdateStrategy;
  constructor(properties: StateTemplateAssociation) {
    Object.assign(this, properties);
  }
}

export class StateTemplateUpdateStrategy {
  OnChange?: { [key: string]: any };
  Periodic?: PeriodicStateTemplateUpdateStrategy;
  constructor(properties: StateTemplateUpdateStrategy) {
    Object.assign(this, properties);
  }
}

export class TimePeriod {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: TimePeriod) {
    Object.assign(this, properties);
  }
}
export interface VehicleProperties {
  AssociationBehavior?: Value<string>;
  Attributes?: { [key: string]: Value<string> };
  DecoderManifestArn: Value<string>;
  StateTemplates?: List<StateTemplateAssociation>;
  ModelManifestArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Vehicle extends ResourceBase<VehicleProperties> {
  static PeriodicStateTemplateUpdateStrategy = PeriodicStateTemplateUpdateStrategy;
  static StateTemplateAssociation = StateTemplateAssociation;
  static StateTemplateUpdateStrategy = StateTemplateUpdateStrategy;
  static TimePeriod = TimePeriod;
  constructor(properties: VehicleProperties) {
    super('AWS::IoTFleetWise::Vehicle', properties);
  }
}
