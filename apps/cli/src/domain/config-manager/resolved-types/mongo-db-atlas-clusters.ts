import type { Subtype } from '@utils/type-helpers';
import type { MongoDbAtlasCluster, MongoDbAtlasClusterProps } from '@stacktape/config/mongo-db-atlas-clusters';

export type StpMongoDbAtlasCluster = MongoDbAtlasCluster['properties'] & {
  name: string;
  type: MongoDbAtlasCluster['type'];
  configParentResourceType: MongoDbAtlasCluster['type'];
  nameChain: string[];
};
export type StpAtlasMongoSharedTierClusterInstanceSize = Subtype<MongoDbAtlasClusterProps['clusterTier'], 'M2' | 'M5'>;
export type StpAtlasMongoGeneralTierClusterInstanceSize = Subtype<
  MongoDbAtlasClusterProps['clusterTier'],
  | 'M10'
  | 'M20'
  | 'M30'
  | 'M40'
  | 'M40 Low-CPU (R40)'
  | 'M40_NVME'
  | 'M50'
  | 'M50 Low-CPU (R50)'
  | 'M50_NVME'
  | 'M60'
  | 'M60 Low-CPU (R60)'
  | 'M60_NVME'
  | 'M80'
  | 'M80 Low-CPU (R80)'
  | 'M80_NVME'
  | 'M100'
  | 'M140'
  | 'M200'
  | 'M200 Low-CPU (R200)'
  | 'M200_NVME'
  | 'M300'
  | 'M300 Low-CPU (R300)'
  | 'M400 Low-CPU (R400)'
  | 'M400_NVME'
  | 'M700 Low-CPU (R700)'
>;
export type MongoDbAtlasClusterReferencableParam = 'connectionString';
