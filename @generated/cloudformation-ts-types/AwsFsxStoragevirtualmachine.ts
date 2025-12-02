// This file is auto-generated. Do not edit manually.
// Source: aws-fsx-storagevirtualmachine.json

/** Resource Type definition for AWS::FSx::StorageVirtualMachine */
export type AwsFsxStoragevirtualmachine = {
  ResourceARN?: string;
  SvmAdminPassword?: string;
  StorageVirtualMachineId?: string;
  ActiveDirectoryConfiguration?: {
    SelfManagedActiveDirectoryConfiguration?: {
      FileSystemAdministratorsGroup?: string;
      UserName?: string;
      DomainName?: string;
      OrganizationalUnitDistinguishedName?: string;
      DomainJoinServiceAccountSecret?: string;
      /** @uniqueItems false */
      DnsIps?: string[];
      Password?: string;
    };
    NetBiosName?: string;
  };
  RootVolumeSecurityStyle?: string;
  FileSystemId: string;
  UUID?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name: string;
};
