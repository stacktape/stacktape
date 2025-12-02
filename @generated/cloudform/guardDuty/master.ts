import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface MasterProperties {
  DetectorId: Value<string>;
  MasterId: Value<string>;
  InvitationId?: Value<string>;
}
export default class Master extends ResourceBase<MasterProperties> {
  constructor(properties: MasterProperties) {
    super('AWS::GuardDuty::Master', properties);
  }
}
