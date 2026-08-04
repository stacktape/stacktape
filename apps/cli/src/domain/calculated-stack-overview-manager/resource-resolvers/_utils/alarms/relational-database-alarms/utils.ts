import type { Dimension } from '@stacktape/cloudformation/resources/aws-cloudwatch-alarm';
import { ref } from '@stacktape/cloudformation/intrinsics';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const getDimensionsForAuroraCluster = ({
  databaseResource
}: {
  databaseResource: StpRelationalDatabase;
}): Dimension[] => {
  return [
    {
      Name: 'DBClusterIdentifier',
      Value: ref(cfLogicalNames.auroraDbCluster(databaseResource.name))
    }
  ];
};

export const getDimensionsForAuroraInstance = ({
  databaseResource,
  instanceNumber
}: {
  databaseResource: StpRelationalDatabase;
  instanceNumber: number;
}): Dimension[] => {
  return [
    {
      Name: 'DBInstanceIdentifier',
      Value: ref(cfLogicalNames.auroraDbInstance(databaseResource.name, instanceNumber))
    }
  ];
};

export const getDimensionsForAuroraRole = ({
  databaseResource,
  role
}: {
  databaseResource: StpRelationalDatabase;
  role: 'READER' | 'WRITER';
}): Dimension[] => {
  return [
    {
      Name: 'DBClusterIdentifier',
      Value: ref(cfLogicalNames.auroraDbCluster(databaseResource.name))
    },
    {
      Name: 'Role',
      Value: role
    }
  ];
};

export const getDimensionsForInstance = ({
  databaseResource
}: {
  databaseResource: StpRelationalDatabase;
}): Dimension[] => {
  return [
    {
      Name: 'DBInstanceIdentifier',
      Value: ref(cfLogicalNames.dbInstance(databaseResource.name))
    }
  ];
};
