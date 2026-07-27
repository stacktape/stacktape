import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Targets {
  Values!: List<Value<string>>;
  Key!: Value<string>;
  constructor(properties: Targets) {
    Object.assign(this, properties);
  }
}
export interface MaintenanceWindowTargetProperties {
  OwnerInformation?: Value<string>;
  Description?: Value<string>;
  WindowId: Value<string>;
  ResourceType: Value<string>;
  Targets: List<Targets>;
  Name?: Value<string>;
}
export default class MaintenanceWindowTarget extends ResourceBase<MaintenanceWindowTargetProperties> {
  static Targets = Targets;
  constructor(properties: MaintenanceWindowTargetProperties) {
    super('AWS::SSM::MaintenanceWindowTarget', properties);
  }
}
