export const cfRegistryNames = {
  buildRoleNameFromPackagePrefix({ packagePrefix, region }: { packagePrefix: string; region: string }) {
    return `stp-${packagePrefix}-${region}`;
  },

  buildZipPackageNameFromPackagePrefix({ packagePrefix }: { packagePrefix: string }) {
    return `${packagePrefix}.zip`;
  },

  buildRoleDefinitionFileNameFromPackagePrefix({ packagePrefix }: { packagePrefix: string }) {
    return `${packagePrefix}-role.yml`;
  },

  buildLogGroupNameFromPackagePrefix({ packagePrefix }: { packagePrefix: string }) {
    return `/stp/cloudformation/${packagePrefix}`;
  }
};
