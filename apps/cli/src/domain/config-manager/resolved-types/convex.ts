import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import type { Convex } from '@stacktape/config/convex';

export type StpConvex = Convex['properties'] & {
  name: string;
  type: Convex['type'];
  configParentResourceType: Convex['type'];
  nameChain: string[];
  _nestedResources: {
    backendContainerWorkload: StpContainerWorkload;
    dashboardContainerWorkload?: StpContainerWorkload;
    database: StpRelationalDatabase;
    modulesBucket: StpBucket;
    filesBucket: StpBucket;
    searchBucket: StpBucket;
    exportsBucket: StpBucket;
    snapshotImportsBucket: StpBucket;
    loadBalancer: StpApplicationLoadBalancer;
  };
};
