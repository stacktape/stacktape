import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BgpOptions {
  PeerAsn?: Value<number>;
  constructor(properties: BgpOptions) {
    Object.assign(this, properties);
  }
}

export class ConnectPeerBgpConfiguration {
  PeerAddress?: Value<string>;
  CoreNetworkAddress?: Value<string>;
  PeerAsn?: Value<number>;
  CoreNetworkAsn?: Value<number>;
  constructor(properties: ConnectPeerBgpConfiguration) {
    Object.assign(this, properties);
  }
}

export class ConnectPeerConfiguration {
  BgpConfigurations?: List<ConnectPeerBgpConfiguration>;
  PeerAddress?: Value<string>;
  CoreNetworkAddress?: Value<string>;
  InsideCidrBlocks?: List<Value<string>>;
  Protocol?: Value<string>;
  constructor(properties: ConnectPeerConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ConnectPeerProperties {
  ConnectAttachmentId: Value<string>;
  PeerAddress: Value<string>;
  SubnetArn?: Value<string>;
  CoreNetworkAddress?: Value<string>;
  BgpOptions?: BgpOptions;
  InsideCidrBlocks?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class ConnectPeer extends ResourceBase<ConnectPeerProperties> {
  static BgpOptions = BgpOptions;
  static ConnectPeerBgpConfiguration = ConnectPeerBgpConfiguration;
  static ConnectPeerConfiguration = ConnectPeerConfiguration;
  constructor(properties: ConnectPeerProperties) {
    super('AWS::NetworkManager::ConnectPeer', properties);
  }
}
