import type { OpenSearchDomain } from '@stacktape/config/open-search';

declare global {
type StpOpenSearchDomain = OpenSearchDomain['properties'] & {
  name: string;
  type: OpenSearchDomain['type'];
  configParentResourceType: OpenSearchDomain['type'];
  nameChain: string[];
};
type OpenSearchDomainReferencableParams = 'arn' | 'domainEndpoint';
}
