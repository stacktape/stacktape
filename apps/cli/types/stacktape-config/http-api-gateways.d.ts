import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { HttpApiGateway } from '@stacktape/config/http-api-gateways';
import type { WebService } from '@stacktape/config/web-services';

declare global {
type StpHttpApiGateway = HttpApiGateway['properties'] & {
  name: string;
  type: HttpApiGateway['type'];
  configParentResourceType: WebService['type'] | HttpApiGateway['type'];
  nameChain: string[];
};
type HttpApiGatewayReferencableParam =
  | 'domain'
  | 'customDomains'
  | 'url'
  | 'customDomainUrl'
  | 'customDomainUrls'
  | 'canonicalDomain'
  | CdnReferenceableParam;
type HttpApiGatewayOutputs = {
  integrations: {
    url: string | IntrinsicFunction;
    method: string;
    resourceName: string;
  }[];
};
}
