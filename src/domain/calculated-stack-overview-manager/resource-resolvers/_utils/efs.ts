import type { AccessPointProperties, RootDirectory } from '@cloudform/efs/accessPoint';
import AccessPoint from '@cloudform/efs/accessPoint';
import { Ref } from '@cloudform/functions';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const getEfsAccessPoint = ({
  efsFilesystemName,
  rootDirectory
}: {
  efsFilesystemName: string;
  rootDirectory?: string;
}) => {
  const rootDirConfig: RootDirectory = {
    Path: rootDirectory || '/'
  };
  // CreationInfo is only added if the rootDirectory is specified and not '/'
  if (rootDirectory && rootDirectory !== '/') {
    rootDirConfig.CreationInfo = {
      OwnerUid: '1000',
      OwnerGid: '1000',
      Permissions: '0755' // Standard permissions for new directories
    };
  }

  const props: AccessPointProperties = {
    FileSystemId: Ref(cfLogicalNames.efsFilesystem(efsFilesystemName)),
    PosixUser: {
      Uid: rootDirConfig.Path === '/' ? '0' : '1000',
      Gid: rootDirConfig.Path === '/' ? '0' : '1000'
    },
    RootDirectory: rootDirConfig,
    AccessPointTags: stackManager.getTags()
  };

  return new AccessPoint(props);
};
