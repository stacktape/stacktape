import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { Ref } from '@cloudform/functions';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const getDimensionsForAuroraCluster = ({
  databaseResource
}: {
  databaseResource: StpRelationalDatabase;
}): Dimension[] => {
  return [
    {
      Name: 'DBClusterIdentifier',
      Value: Ref(cfLogicalNames.auroraDbCluster(databaseResource.name))
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
      Value: Ref(cfLogicalNames.auroraDbInstance(databaseResource.name, instanceNumber))
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
      Value: Ref(cfLogicalNames.auroraDbCluster(databaseResource.name))
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
      Value: Ref(cfLogicalNames.dbInstance(databaseResource.name))
    }
  ];
};
