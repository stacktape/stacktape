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
