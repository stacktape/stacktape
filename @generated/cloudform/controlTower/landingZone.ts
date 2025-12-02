import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface LandingZoneProperties {
  Version: Value<string>;
  Manifest: { [key: string]: any };
  Tags?: List<ResourceTag>;
}
export default class LandingZone extends ResourceBase<LandingZoneProperties> {
  constructor(properties: LandingZoneProperties) {
    super('AWS::ControlTower::LandingZone', properties);
  }
}
