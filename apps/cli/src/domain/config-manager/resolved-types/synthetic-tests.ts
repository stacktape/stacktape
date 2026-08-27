import type { SyntheticTest } from '@stacktape/config/synthetic-tests';

export type StpSyntheticTest = SyntheticTest['properties'] & {
  name: string;
  type: SyntheticTest['type'];
  configParentResourceType: SyntheticTest['type'];
  nameChain: string[];
};
