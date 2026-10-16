import type { DsqlDatabase } from '@stacktape/config/dsql-databases';

export type StpDsqlDatabase = DsqlDatabase['properties'] & {
  name: string;
  type: DsqlDatabase['type'];
  configParentResourceType: DsqlDatabase['type'];
  nameChain: string[];
};
