import type { AccessPointProperties, RootDirectory } from '@stacktape/cloudformation/resources/aws-efs-accesspoint';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { ref } from '@stacktape/cloudformation/intrinsics';

import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

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
    FileSystemId: ref(cfLogicalNames.efsFilesystem(efsFilesystemName)),
    PosixUser: {
      Uid: rootDirConfig.Path === '/' ? '0' : '1000',
      Gid: rootDirConfig.Path === '/' ? '0' : '1000'
    },
    RootDirectory: rootDirConfig,
    AccessPointTags: stackManager.getTags()
  };

  return cfnResource('AWS::EFS::AccessPoint', props);
};
