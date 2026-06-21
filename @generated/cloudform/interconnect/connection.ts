import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttachPoint {
  DirectConnectGateway?: Value<string>;
  Arn?: Value<string>;
  constructor(properties: AttachPoint) {
    Object.assign(this, properties);
  }
}

export class Provider {
  CloudServiceProvider?: Value<string>;
  LastMileProvider?: Value<string>;
  constructor(properties: Provider) {
    Object.assign(this, properties);
  }
}

export class RemoteAccount {
  Identifier!: Value<string>;
  constructor(properties: RemoteAccount) {
    Object.assign(this, properties);
  }
}
export interface ConnectionProperties {
  RemoteOwnerAccount?: Value<string>;
  AttachPoint: AttachPoint;
  EnvironmentId?: Value<string>;
  Description?: Value<string>;
  Bandwidth?: Value<string>;
  ActivationKey?: Value<string>;
  Tags?: List<ResourceTag>;
  RemoteAccount?: RemoteAccount;
}
export default class Connection extends ResourceBase<ConnectionProperties> {
  static AttachPoint = AttachPoint;
  static Provider = Provider;
  static RemoteAccount = RemoteAccount;
  constructor(properties: ConnectionProperties) {
    super('AWS::Interconnect::Connection', properties);
  }
}
