import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ActiveDirectoryConfiguration {
  SelfManagedActiveDirectoryConfiguration?: SelfManagedActiveDirectoryConfiguration;
  NetBiosName?: Value<string>;
  constructor(properties: ActiveDirectoryConfiguration) {
    Object.assign(this, properties);
  }
}

export class SelfManagedActiveDirectoryConfiguration {
  FileSystemAdministratorsGroup?: Value<string>;
  UserName?: Value<string>;
  DomainName?: Value<string>;
  OrganizationalUnitDistinguishedName?: Value<string>;
  DnsIps?: List<Value<string>>;
  Password?: Value<string>;
  constructor(properties: SelfManagedActiveDirectoryConfiguration) {
    Object.assign(this, properties);
  }
}
export interface StorageVirtualMachineProperties {
  SvmAdminPassword?: Value<string>;
  ActiveDirectoryConfiguration?: ActiveDirectoryConfiguration;
  RootVolumeSecurityStyle?: Value<string>;
  FileSystemId: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class StorageVirtualMachine extends ResourceBase<StorageVirtualMachineProperties> {
  static ActiveDirectoryConfiguration = ActiveDirectoryConfiguration;
  static SelfManagedActiveDirectoryConfiguration = SelfManagedActiveDirectoryConfiguration;
  constructor(properties: StorageVirtualMachineProperties) {
    super('AWS::FSx::StorageVirtualMachine', properties);
  }
}
