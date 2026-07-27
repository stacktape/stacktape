import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface NetworkInterfacePermissionProperties {
  AwsAccountId: Value<string>;
  NetworkInterfaceId: Value<string>;
  Permission: Value<string>;
}
export default class NetworkInterfacePermission extends ResourceBase<NetworkInterfacePermissionProperties> {
  constructor(properties: NetworkInterfacePermissionProperties) {
    super('AWS::EC2::NetworkInterfacePermission', properties);
  }
}
