import type { OpenSearchDomain } from '@stacktape/config/open-search';

export type StpOpenSearchDomain = OpenSearchDomain['properties'] & {
  name: string;
  type: OpenSearchDomain['type'];
  configParentResourceType: OpenSearchDomain['type'];
  nameChain: string[];
};
