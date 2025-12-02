import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MountOptions {
  Version?: Value<string>;
  constructor(properties: MountOptions) {
    Object.assign(this, properties);
  }
}

export class NFS {
  MountOptions!: MountOptions;
  constructor(properties: NFS) {
    Object.assign(this, properties);
  }
}

export class Protocol {
  NFS?: NFS;
  constructor(properties: Protocol) {
    Object.assign(this, properties);
  }
}
export interface LocationFSxOpenZFSProperties {
  Subdirectory?: Value<string>;
  FsxFilesystemArn?: Value<string>;
  Protocol: Protocol;
  SecurityGroupArns: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class LocationFSxOpenZFS extends ResourceBase<LocationFSxOpenZFSProperties> {
  static MountOptions = MountOptions;
  static NFS = NFS;
  static Protocol = Protocol;
  constructor(properties: LocationFSxOpenZFSProperties) {
    super('AWS::DataSync::LocationFSxOpenZFS', properties);
  }
}
