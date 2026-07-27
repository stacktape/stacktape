import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ClientAuthentication {
  Sasl!: Sasl;
  constructor(properties: ClientAuthentication) {
    Object.assign(this, properties);
  }
}

export class Iam {
  Enabled!: Value<boolean>;
  constructor(properties: Iam) {
    Object.assign(this, properties);
  }
}

export class Sasl {
  Iam!: Iam;
  constructor(properties: Sasl) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  SecurityGroups?: List<Value<string>>;
  SubnetIds!: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface ServerlessClusterProperties {
  VpcConfigs: List<VpcConfig>;
  ClusterName: Value<string>;
  ClientAuthentication: ClientAuthentication;
  Tags?: { [key: string]: Value<string> };
}
export default class ServerlessCluster extends ResourceBase<ServerlessClusterProperties> {
  static ClientAuthentication = ClientAuthentication;
  static Iam = Iam;
  static Sasl = Sasl;
  static VpcConfig = VpcConfig;
  constructor(properties: ServerlessClusterProperties) {
    super('AWS::MSK::ServerlessCluster', properties);
  }
}
