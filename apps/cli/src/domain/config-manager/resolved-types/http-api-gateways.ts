import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { CdnReferenceableParam } from '@domain-services/config-manager/resolved-types/cdn';
import type { HttpApiGateway } from '@stacktape/config/http-api-gateways';
import type { WebService } from '@stacktape/config/web-services';

export type StpHttpApiGateway = HttpApiGateway['properties'] & {
  name: string;
  type: HttpApiGateway['type'];
  configParentResourceType: WebService['type'] | HttpApiGateway['type'];
  nameChain: string[];
};
export type HttpApiGatewayReferencableParam =
  | 'domain'
  | 'customDomains'
  | 'url'
  | 'customDomainUrl'
  | 'customDomainUrls'
  | 'canonicalDomain'
  | CdnReferenceableParam;
export type HttpApiGatewayOutputs = {
  integrations: {
    url: string | Intrinsic;
    method: string;
    resourceName: string;
  }[];
};
