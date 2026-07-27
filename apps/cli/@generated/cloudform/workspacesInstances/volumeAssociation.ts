import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface VolumeAssociationProperties {
  VolumeId: Value<string>;
  WorkspaceInstanceId: Value<string>;
  Device: Value<string>;
  DisassociateMode?: Value<string>;
}
export default class VolumeAssociation extends ResourceBase<VolumeAssociationProperties> {
  constructor(properties: VolumeAssociationProperties) {
    super('AWS::WorkspacesInstances::VolumeAssociation', properties);
  }
}
