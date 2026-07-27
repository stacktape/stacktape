import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SnapshotBlockPublicAccessProperties {
  State: Value<string>;
}
export default class SnapshotBlockPublicAccess extends ResourceBase<SnapshotBlockPublicAccessProperties> {
  constructor(properties: SnapshotBlockPublicAccessProperties) {
    super('AWS::EC2::SnapshotBlockPublicAccess', properties);
  }
}
