import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessScopePathRequest {
  Destination?: PathStatementRequest;
  ThroughResources?: List<ThroughResourcesStatementRequest>;
  Source?: PathStatementRequest;
  constructor(properties: AccessScopePathRequest) {
    Object.assign(this, properties);
  }
}

export class PacketHeaderStatementRequest {
  Protocols?: List<Value<string>>;
  DestinationPorts?: List<Value<string>>;
  DestinationAddresses?: List<Value<string>>;
  DestinationPrefixLists?: List<Value<string>>;
  SourceAddresses?: List<Value<string>>;
  SourcePorts?: List<Value<string>>;
  SourcePrefixLists?: List<Value<string>>;
  constructor(properties: PacketHeaderStatementRequest) {
    Object.assign(this, properties);
  }
}

export class PathStatementRequest {
  ResourceStatement?: ResourceStatementRequest;
  PacketHeaderStatement?: PacketHeaderStatementRequest;
  constructor(properties: PathStatementRequest) {
    Object.assign(this, properties);
  }
}

export class ResourceStatementRequest {
  ResourceTypes?: List<Value<string>>;
  Resources?: List<Value<string>>;
  constructor(properties: ResourceStatementRequest) {
    Object.assign(this, properties);
  }
}

export class ThroughResourcesStatementRequest {
  ResourceStatement?: ResourceStatementRequest;
  constructor(properties: ThroughResourcesStatementRequest) {
    Object.assign(this, properties);
  }
}
export interface NetworkInsightsAccessScopeProperties {
  ExcludePaths?: List<AccessScopePathRequest>;
  MatchPaths?: List<AccessScopePathRequest>;
  Tags?: List<ResourceTag>;
}
export default class NetworkInsightsAccessScope extends ResourceBase<NetworkInsightsAccessScopeProperties> {
  static AccessScopePathRequest = AccessScopePathRequest;
  static PacketHeaderStatementRequest = PacketHeaderStatementRequest;
  static PathStatementRequest = PathStatementRequest;
  static ResourceStatementRequest = ResourceStatementRequest;
  static ThroughResourcesStatementRequest = ThroughResourcesStatementRequest;
  constructor(properties?: NetworkInsightsAccessScopeProperties) {
    super('AWS::EC2::NetworkInsightsAccessScope', properties || {});
  }
}
