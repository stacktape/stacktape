import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface HubProperties {
  ControlFindingGenerator?: Value<string>;
  EnableDefaultStandards?: Value<boolean>;
  AutoEnableControls?: Value<boolean>;
  Tags?: { [key: string]: Value<string> };
}
export default class Hub extends ResourceBase<HubProperties> {
  constructor(properties?: HubProperties) {
    super('AWS::SecurityHub::Hub', properties || {});
  }
}
