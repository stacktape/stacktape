import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CoreNetworkEdge {
  InsideCidrBlocks?: List<Value<string>>;
  Asn?: Value<number>;
  EdgeLocation?: Value<string>;
  constructor(properties: CoreNetworkEdge) {
    Object.assign(this, properties);
  }
}

export class CoreNetworkNetworkFunctionGroup {
  EdgeLocations?: List<Value<string>>;
  Segments?: Segments;
  Name?: Value<string>;
  constructor(properties: CoreNetworkNetworkFunctionGroup) {
    Object.assign(this, properties);
  }
}

export class CoreNetworkSegment {
  EdgeLocations?: List<Value<string>>;
  SharedSegments?: List<Value<string>>;
  Name?: Value<string>;
  constructor(properties: CoreNetworkSegment) {
    Object.assign(this, properties);
  }
}

export class Segments {
  SendTo?: List<Value<string>>;
  SendVia?: List<Value<string>>;
  constructor(properties: Segments) {
    Object.assign(this, properties);
  }
}
export interface CoreNetworkProperties {
  GlobalNetworkId: Value<string>;
  Description?: Value<string>;
  PolicyDocument?: { [key: string]: any };
  Tags?: List<ResourceTag>;
}
export default class CoreNetwork extends ResourceBase<CoreNetworkProperties> {
  static CoreNetworkEdge = CoreNetworkEdge;
  static CoreNetworkNetworkFunctionGroup = CoreNetworkNetworkFunctionGroup;
  static CoreNetworkSegment = CoreNetworkSegment;
  static Segments = Segments;
  constructor(properties: CoreNetworkProperties) {
    super('AWS::NetworkManager::CoreNetwork', properties);
  }
}
