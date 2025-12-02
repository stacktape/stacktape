import type { CachePolicyConfig } from '@cloudform/cloudFront/cachePolicy';
import type { CacheBehavior, DistributionConfig, OriginCustomHeader } from '@cloudform/cloudFront/distribution';
import type {
  CookiesConfig as OriginRequestCookiesConfig,
  HeadersConfig as OriginRequestHeadersConfig,
  OriginRequestPolicyConfig,
  QueryStringsConfig as OriginRequestQueryStringsConfig
} from '@cloudform/cloudFront/originRequestPolicy';
import type { IntrinsicFunction } from '@cloudform/dataTypes';
import { globalStateManager } from '@application-services/global-state-manager';
import CloudfrontCachePolicy, {
  CookiesConfig as CacheCookiesConfig,
  HeadersConfig as CacheHeadersConfig,
  QueryStringsConfig as CacheQueryStringsConfig
} from '@cloudform/cloudFront/cachePolicy';
import CloudfrontOriginAccessIdentity from '@cloudform/cloudFront/cloudFrontOriginAccessIdentity';
import CloudfrontDistribution, {
  DefaultCacheBehavior,
  FunctionAssociation,
  LambdaFunctionAssociation,
  Origin
} from '@cloudform/cloudFront/distribution';
import CloudfrontOriginRequestPolicy from '@cloudform/cloudFront/originRequestPolicy';
import { GetAtt, Join, Ref, Select, Split } from '@cloudform/functions';
import Route53Record from '@cloudform/route53/recordSet';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToApplicationLoadBalancer } from '@domain-services/config-manager/utils/application-load-balancers';
import { resolveReferenceToBucket } from '@domain-services/config-manager/utils/buckets';
import { resolveReferenceToEdgeLambdaFunction } from '@domain-services/config-manager/utils/edge-functions';
import { resolveReferenceToHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { resolveReferenceToFirewall } from '@domain-services/config-manager/utils/web-app-firewall';
import { domainManager } from '@domain-services/domain-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { stacktapeCloudfrontHeaders } from '@shared/naming/stacktape-cloudfront-headers';
import { shortHash } from '@shared/utils/short-hash';
import { getApexDomain } from '@utils/domains';
import { ExpectedError, UnexpectedError } from '@utils/errors';
import objectHash from 'object-hash';
import { getStpServiceCustomResource } from './custom-resource';

export const getCloudfrontDefaultStaticCachePolicyResource = (stackName: string) =>
  new CloudfrontCachePolicy({ CachePolicyConfig: getCloudfrontDefaultStaticCachePolicyConfig(stackName) });

export const getCloudfrontDefaultDynamicCachePolicyResource = (stackName: string) =>
  new CloudfrontCachePolicy({ CachePolicyConfig: getCloudfrontDefaultDynamicCachePolicyConfig(stackName) });

export const getCloudfrontCustomizedCachePolicyResource = ({
  cachingOptions,
  originType,
  stpResourceNameName,
  stackName
}: {
  stpResourceNameName: string;
  cachingOptions: CdnCachingOptions;
  originType: StpCdnOriginTargetableByRouteRewrite;
  stackName: string;
}) => {
  const defaultOptions =
    originType === 'bucket'
      ? getCloudfrontDefaultStaticCachePolicyConfig(stackName)
      : // http-api-gateway application-load-balancer and custom-origin all use dynamic cache policy
        // when using dynamic cache policy nothing is cached by default - it is up to origin to set caching through headers
        getCloudfrontDefaultDynamicCachePolicyConfig(stackName);

  const defaultTTL =
    cachingOptions?.defaultTTL !== undefined
      ? cachingOptions?.defaultTTL
      : Math.min(
          Math.max(
            ...[defaultOptions.DefaultTTL as number, cachingOptions?.minTTL].filter((value) => value !== undefined)
          ),
          defaultOptions.MaxTTL as number
        );
  const minTTL =
    cachingOptions?.minTTL !== undefined
      ? cachingOptions?.minTTL
      : Math.min(
          ...[defaultOptions.MinTTL as number, cachingOptions?.defaultTTL, cachingOptions?.maxTTL].filter(
            (value) => value !== undefined
          )
        );
  const maxTTL =
    cachingOptions?.maxTTL !== undefined
      ? cachingOptions?.maxTTL
      : Math.max(
          ...[defaultOptions.MaxTTL as number, cachingOptions?.minTTL, cachingOptions?.defaultTTL].filter(
            (value) => value !== undefined
          )
        );
  return new CloudfrontCachePolicy({
    CachePolicyConfig: {
      DefaultTTL: defaultTTL,
      MaxTTL: maxTTL,
      MinTTL: minTTL,
      Name: awsResourceNames.cloudfrontCachePolicy(
        stpResourceNameName,
        stackName,
        getCachePolicyHash({ cachingOptions })
      ),
      ParametersInCacheKeyAndForwardedToOrigin: {
        CookiesConfig: cachingOptions?.cacheKeyParameters?.cookies
          ? formatCacheCookiesConfig(cachingOptions?.cacheKeyParameters?.cookies, stpResourceNameName)
          : defaultOptions.ParametersInCacheKeyAndForwardedToOrigin.CookiesConfig,
        EnableAcceptEncodingGzip: !cachingOptions.disableCompression,
        EnableAcceptEncodingBrotli: !cachingOptions.disableCompression,
        HeadersConfig: cachingOptions?.cacheKeyParameters?.headers
          ? formatCacheHeadersConfig(cachingOptions?.cacheKeyParameters?.headers, stpResourceNameName)
          : defaultOptions.ParametersInCacheKeyAndForwardedToOrigin.HeadersConfig,
        QueryStringsConfig: cachingOptions?.cacheKeyParameters?.queryString
          ? formatCacheQueryStringConfig(cachingOptions?.cacheKeyParameters?.queryString, stpResourceNameName)
          : defaultOptions.ParametersInCacheKeyAndForwardedToOrigin.QueryStringsConfig
      }
    }
  });
};

export const isCustomCachePolicyNeeded = ({
  cachingOptions,
  originType,
  stackName
}: {
  cachingOptions: CdnCachingOptions;
  originType: StpCdnOriginTargetableByRouteRewrite;
  stackName: string;
}) => {
  const defaultOptions =
    originType === 'bucket'
      ? getCloudfrontDefaultStaticCachePolicyConfig(stackName)
      : // http-api-gateway application-load-balancer and custom-origin all use dynamic cache policy
        // when using dynamic cache policy nothing is cached by default - it is up to origin to set caching through headers
        getCloudfrontDefaultDynamicCachePolicyConfig(stackName);
  return (
    (!cachingOptions?.cachePolicyId &&
      cachingOptions?.cacheKeyParameters?.cookies &&
      getConfigBehaviour(cachingOptions.cacheKeyParameters.cookies) !==
        defaultOptions.ParametersInCacheKeyAndForwardedToOrigin.CookiesConfig.CookieBehavior) ||
    (cachingOptions?.cacheKeyParameters?.headers &&
      getConfigBehaviour(cachingOptions.cacheKeyParameters.headers) !==
        defaultOptions.ParametersInCacheKeyAndForwardedToOrigin.HeadersConfig.HeaderBehavior) ||
    (cachingOptions?.cacheKeyParameters?.queryString &&
      getConfigBehaviour(cachingOptions.cacheKeyParameters.queryString) !==
        defaultOptions.ParametersInCacheKeyAndForwardedToOrigin.QueryStringsConfig.QueryStringBehavior) ||
    (cachingOptions?.defaultTTL && cachingOptions.defaultTTL !== defaultOptions.DefaultTTL) ||
    (cachingOptions?.maxTTL && cachingOptions.maxTTL !== defaultOptions.MaxTTL) ||
    (cachingOptions?.minTTL && cachingOptions.minTTL !== defaultOptions.MinTTL)
  );
};

export const getCachePolicyHash = ({ cachingOptions }: { cachingOptions: CdnCachingOptions }) => {
  return shortHash(objectHash(cachingOptions));
};

const getCloudfrontDefaultStaticCachePolicyConfig = (stackName: string): CachePolicyConfig => ({
  DefaultTTL: 15768000,
  MaxTTL: 31536000,
  MinTTL: 0,
  Name: awsResourceNames.cloudfrontDefaultCachePolicy('DefStatic', stackName),
  ParametersInCacheKeyAndForwardedToOrigin: {
    CookiesConfig: { CookieBehavior: 'none' },
    EnableAcceptEncodingGzip: true,
    EnableAcceptEncodingBrotli: true,
    HeadersConfig: { HeaderBehavior: 'none' },
    QueryStringsConfig: { QueryStringBehavior: 'none' }
  }
});

const getCloudfrontDefaultDynamicCachePolicyConfig = (stackName: string): CachePolicyConfig => ({
  DefaultTTL: 0,
  MaxTTL: 31536000,
  MinTTL: 0,
  Name: awsResourceNames.cloudfrontDefaultCachePolicy('DefDynamic', stackName),
  ParametersInCacheKeyAndForwardedToOrigin: {
    CookiesConfig: { CookieBehavior: 'none' },
    EnableAcceptEncodingGzip: true,
    EnableAcceptEncodingBrotli: true,
    HeadersConfig: { HeaderBehavior: 'whitelist', Headers: ['Authorization'] },
    QueryStringsConfig: { QueryStringBehavior: 'all' }
  }
});

export const getCloudfrontDefaultStaticOriginRequestPolicyResource = (stackName: string) =>
  new CloudfrontOriginRequestPolicy({
    OriginRequestPolicyConfig: getCloudfrontDefaultStaticOriginRequestPolicyConfig(stackName)
  });

export const getCloudfrontDefaultDynamicOriginRequestPolicyResource = (stackName: string) =>
  new CloudfrontOriginRequestPolicy({
    OriginRequestPolicyConfig: getCloudfrontDefaultDynamicOriginRequestPolicyConfig(stackName)
  });

export const getCloudfrontCustomizedOriginRequestPolicyResource = ({
  forwardingOptions,
  originType,
  stackName,
  stpResourceNameName
}: {
  stpResourceNameName: string;
  forwardingOptions: CdnForwardingOptions;
  originType: StpCdnOriginTargetableByRouteRewrite;
  stackName: string;
}) => {
  const defaultOptions =
    originType === 'bucket'
      ? getCloudfrontDefaultStaticOriginRequestPolicyConfig(stackName)
      : // http-api-gateway application-load-balancer and custom-origin all use dynamic origin request policy
        // when using dynamic origin request policy everything is forwarded to the origin by default
        getCloudfrontDefaultDynamicOriginRequestPolicyConfig(stackName);
  return new CloudfrontOriginRequestPolicy({
    OriginRequestPolicyConfig: {
      CookiesConfig: forwardingOptions.cookies
        ? formatOriginRequestCookiesConfig(forwardingOptions.cookies, stpResourceNameName)
        : defaultOptions.CookiesConfig,
      HeadersConfig: forwardingOptions.headers
        ? formatOriginRequestHeadersConfig(forwardingOptions.headers, stpResourceNameName)
        : defaultOptions.HeadersConfig,
      QueryStringsConfig: forwardingOptions.queryString
        ? formatOriginRequestQueryStringConfig(forwardingOptions.queryString, stpResourceNameName)
        : defaultOptions.QueryStringsConfig,
      Name: awsResourceNames.cloudfrontOriginRequestPolicy(
        stpResourceNameName,
        stackName,
        getOriginRequestPolicyHash({ forwardingOptions })
      )
    }
  });
};

export const isCustomOriginRequestPolicyNeeded = ({
  forwardingOptions,
  originType,
  stackName
}: {
  forwardingOptions: CdnForwardingOptions;
  originType: StpCdnOriginTargetableByRouteRewrite;
  stackName: string;
}) => {
  const defaultOptions =
    originType === 'bucket'
      ? getCloudfrontDefaultStaticOriginRequestPolicyConfig(stackName)
      : // http-api-gateway application-load-balancer and custom-origin all use dynamic origin request policy
        // when using dynamic origin request policy everything is forwarded to the origin by default
        getCloudfrontDefaultDynamicOriginRequestPolicyConfig(stackName);
  return (
    (!forwardingOptions?.originRequestPolicyId &&
      forwardingOptions?.cookies &&
      getConfigBehaviour(forwardingOptions.cookies) !== defaultOptions.CookiesConfig.CookieBehavior) ||
    (forwardingOptions?.headers &&
      getConfigBehaviour(forwardingOptions.headers) !== defaultOptions.HeadersConfig.HeaderBehavior) ||
    (forwardingOptions?.queryString &&
      getConfigBehaviour(forwardingOptions.queryString) !== defaultOptions.QueryStringsConfig.QueryStringBehavior)
  );
};

export const getOriginRequestPolicyHash = ({ forwardingOptions }: { forwardingOptions: CdnForwardingOptions }) => {
  return shortHash(
    objectHash(forwardingOptions, {
      excludeKeys: (key: keyof CdnForwardingOptions) => key === 'allowedMethods' || key === 'customRequestHeaders'
    })
  );
};

const getCloudfrontDefaultDynamicOriginRequestPolicyConfig = (stackName: string): OriginRequestPolicyConfig => ({
  Name: awsResourceNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic', stackName),
  CookiesConfig: { CookieBehavior: 'all' },
  HeadersConfig: { HeaderBehavior: 'allExcept', Headers: ['host'] },
  QueryStringsConfig: { QueryStringBehavior: 'all' }
});

const getCloudfrontDefaultStaticOriginRequestPolicyConfig = (stackName: string): OriginRequestPolicyConfig => ({
  Name: awsResourceNames.cloudfrontDefaultOriginRequestPolicy('DefStatic', stackName),
  CookiesConfig: { CookieBehavior: 'none' },
  HeadersConfig: { HeaderBehavior: 'whitelist', Headers: ['if-match', 'if-none-match', 'if-modified-since'] },
  QueryStringsConfig: { QueryStringBehavior: 'none' }
});

const getConfigBehaviour = (
  config:
    | CdnCachingOptions['cacheKeyParameters']['cookies']
    | CdnCachingOptions['cacheKeyParameters']['headers']
    | CdnCachingOptions['cacheKeyParameters']['queryString']
    | CdnForwardingOptions['cookies']
    | CdnForwardingOptions['headers']
    | CdnForwardingOptions['queryString']
) => {
  return Object.keys(config || {})[0];
};

// goes through cdn configuration and constructs all origins for distribution
const getOriginsForDistribution = (
  cdnCompatibleResource: StpCdnCompatibleResource
  // defaultOriginType: StpCdnAttachableResourceType
): Origin[] => {
  const finalOrigins: Origin[] = [];
  // dealing with default origins
  if (cdnCompatibleResource.type === 'bucket') {
    finalOrigins.push(
      buildBucketOrigin({
        stpResourceNameOfReferencer: cdnCompatibleResource.name,
        stpBucketReference: cdnCompatibleResource.nameChain.join('.'),
        routePrefix: cdnCompatibleResource.cdn.defaultRoutePrefix,
        rewriteRoutesForSinglePageApp: (cdnCompatibleResource as StpBucket).cdn.rewriteRoutesForSinglePageApp,
        disableUrlOptimization: (cdnCompatibleResource as StpBucket).cdn.disableUrlNormalization,
        cacheBehaviourIndex: 0,
        forwardingOptions: cdnCompatibleResource.cdn.forwardingOptions
      })
    );
  } else if (cdnCompatibleResource.type === 'http-api-gateway') {
    finalOrigins.push(
      buildHttpApiOrigin({
        stpResourceNameOfReferencer: cdnCompatibleResource.name,
        stpHttpApiGatewayReference: cdnCompatibleResource.nameChain.join('.'),
        routePrefix: cdnCompatibleResource.cdn.defaultRoutePrefix,
        cacheBehaviourIndex: 0,
        cachingOptions: cdnCompatibleResource.cdn.cachingOptions,
        forwardingOptions: cdnCompatibleResource.cdn.forwardingOptions
      })
    );
  } else if (cdnCompatibleResource.type === 'function') {
    finalOrigins.push(
      buildLambdaFunctionOrigin({
        stpResourceNameOfReferencer: cdnCompatibleResource.name,
        stpFunctionReference: cdnCompatibleResource.nameChain.join('.'),
        routePrefix: cdnCompatibleResource.cdn.defaultRoutePrefix,
        cacheBehaviourIndex: 0,
        cachingOptions: cdnCompatibleResource.cdn.cachingOptions,
        forwardingOptions: cdnCompatibleResource.cdn.forwardingOptions
      })
    );
  } else if (cdnCompatibleResource.type === 'application-load-balancer') {
    finalOrigins.push(
      buildLoadBalancerOrigin({
        stpResourceNameOfReferencer: cdnCompatibleResource.name,
        targetLoadBalancerReference: {
          loadBalancerName: cdnCompatibleResource.nameChain.join('.'),
          listenerPort: (cdnCompatibleResource as StpApplicationLoadBalancer).cdn.listenerPort
        } as ApplicationLoadBalancerIntegrationProps,

        explicitOriginDomainName: (cdnCompatibleResource as StpApplicationLoadBalancer).cdn.originDomainName,
        routePrefix: cdnCompatibleResource.cdn.defaultRoutePrefix,
        cacheBehaviourIndex: 0,
        cachingOptions: cdnCompatibleResource.cdn.cachingOptions,
        forwardingOptions: cdnCompatibleResource.cdn.forwardingOptions
      })
    );
  }
  // here we need to deal with route rewrites
  cdnCompatibleResource.cdn.routeRewrites?.forEach((routeRewrite, index) => {
    const cacheBehaviourIndex = index + 1;
    if (routeRewrite.routeTo?.type === 'bucket' || (!routeRewrite.routeTo && cdnCompatibleResource.type === 'bucket')) {
      finalOrigins.push(
        buildBucketOrigin({
          stpResourceNameOfReferencer: cdnCompatibleResource.name,
          stpBucketReference: !routeRewrite.routeTo?.type
            ? cdnCompatibleResource.nameChain.join('.')
            : (routeRewrite.routeTo as CdnBucketRoute).properties.bucketName,
          routePrefix: routeRewrite.routePrefix,
          cacheBehaviourIndex,
          forwardingOptions: routeRewrite.forwardingOptions,
          disableUrlOptimization: (routeRewrite.routeTo as CdnBucketRoute)?.properties.disableUrlNormalization,
          rewriteRoutesForSinglePageApp: false
        })
      );
    } else if (
      routeRewrite.routeTo?.type === 'http-api-gateway' ||
      (!routeRewrite.routeTo && cdnCompatibleResource.type === 'http-api-gateway')
    ) {
      finalOrigins.push(
        buildHttpApiOrigin({
          stpResourceNameOfReferencer: cdnCompatibleResource.name,
          stpHttpApiGatewayReference: !routeRewrite.routeTo
            ? cdnCompatibleResource.nameChain.join('.')
            : (routeRewrite.routeTo as CdnHttpApiGatewayRoute).properties.httpApiGatewayName,
          routePrefix: routeRewrite.routePrefix,
          cacheBehaviourIndex,
          forwardingOptions: routeRewrite.forwardingOptions,
          cachingOptions: routeRewrite.cachingOptions
        })
      );
    } else if (
      routeRewrite.routeTo?.type === 'function' ||
      (!routeRewrite.routeTo && cdnCompatibleResource.type === 'function')
    ) {
      finalOrigins.push(
        buildLambdaFunctionOrigin({
          stpResourceNameOfReferencer: cdnCompatibleResource.name,
          stpFunctionReference: !routeRewrite.routeTo
            ? cdnCompatibleResource.nameChain.join('.')
            : (routeRewrite.routeTo as CdnLambdaFunctionRoute).properties.functionName,
          routePrefix: routeRewrite.routePrefix,
          cacheBehaviourIndex,
          forwardingOptions: routeRewrite.forwardingOptions,
          cachingOptions: routeRewrite.cachingOptions
        })
      );
    } else if (
      routeRewrite.routeTo?.type === 'application-load-balancer' ||
      (!routeRewrite.routeTo && cdnCompatibleResource.type === 'application-load-balancer')
    ) {
      finalOrigins.push(
        buildLoadBalancerOrigin({
          stpResourceNameOfReferencer: cdnCompatibleResource.name,
          targetLoadBalancerReference: (!routeRewrite.routeTo
            ? {
                loadBalancerName: cdnCompatibleResource.nameChain.join('.'),
                listenerPort: (cdnCompatibleResource as StpApplicationLoadBalancer).cdn.listenerPort
              }
            : {
                loadBalancerName: (routeRewrite.routeTo as CdnLoadBalancerRoute).properties.loadBalancerName,
                listenerPort: (routeRewrite.routeTo as CdnLoadBalancerRoute).properties.listenerPort
              }) as ApplicationLoadBalancerIntegrationProps,

          explicitOriginDomainName: !routeRewrite.routeTo
            ? (routeRewrite.routeTo as CdnLoadBalancerRoute).properties.originDomainName ||
              (cdnCompatibleResource as StpApplicationLoadBalancer).cdn.originDomainName
            : (routeRewrite.routeTo as CdnLoadBalancerRoute).properties.originDomainName,
          routePrefix: !routeRewrite.routeTo
            ? routeRewrite.routePrefix || cdnCompatibleResource.cdn.defaultRoutePrefix
            : routeRewrite.routePrefix,
          cacheBehaviourIndex,
          cachingOptions: routeRewrite.cachingOptions,
          forwardingOptions: routeRewrite.forwardingOptions
        })
      );
    } else if (routeRewrite.routeTo?.type === 'custom-origin') {
      finalOrigins.push(
        buildCustomDomainOrigin({
          targetCustomOriginProperties: routeRewrite.routeTo.properties,
          routePrefix: routeRewrite.routePrefix,
          cacheBehaviourIndex,
          forwardingOptions: routeRewrite.forwardingOptions,
          cachingOptions: routeRewrite.cachingOptions
        })
      );
    }
  });

  return finalOrigins;
};

// const isHostHeaderNeeded = ({
//   originType,
//   forwardingOptions,
//   cachingOptions,
//   originProtocol
// }: {
//   originType: StpCdnOriginTargetableByRouteRewrite;
//   forwardingOptions: CdnForwardingOptions | undefined;
//   cachingOptions: CdnCachingOptions | undefined;
//   originProtocol?: 'HTTP' | 'HTTPS';
// }): boolean => {
//   if (
//     (((originType === 'application-load-balancer' || originType === 'custom-origin') && originProtocol === 'HTTPS') ||
//       originType === 'http-api-gateway') &&
//     (forwardingOptions?.headers?.allViewer ||
//       forwardingOptions?.headers?.allViewerAndWhitelistCloudFront ||
//       forwardingOptions?.headers?.whitelist?.some((headerName) => headerName.toLowerCase() === 'host') ||
//       (forwardingOptions?.headers?.allExcept &&
//         !forwardingOptions?.headers?.allExcept.some((headerName) => headerName.toLowerCase() === 'host')) ||
//       cachingOptions?.cacheKeyParameters?.headers?.whitelist?.some((headerName) => headerName.toLowerCase() === 'host'))
//   ) {
//     return true;
//   }

//   return false;
// };

const buildBucketOrigin = ({
  stpResourceNameOfReferencer,
  stpBucketReference,
  routePrefix,
  cacheBehaviourIndex,
  rewriteRoutesForSinglePageApp,
  forwardingOptions,
  disableUrlOptimization
}: {
  stpResourceNameOfReferencer: string;
  stpBucketReference: string;
  routePrefix: string | undefined;
  cacheBehaviourIndex: number;
  rewriteRoutesForSinglePageApp: boolean;
  disableUrlOptimization: boolean;
  forwardingOptions: CdnForwardingOptions | undefined;
}): Origin => {
  const { name: bucketStpName } = resolveReferenceToBucket({
    stpResourceReference: stpBucketReference,
    referencedFrom: stpResourceNameOfReferencer
  });
  return new Origin({
    DomainName: GetAtt(cfLogicalNames.bucket(bucketStpName), 'RegionalDomainName'),
    Id: awsResourceNames.cloudfrontOriginId(bucketStpName, cacheBehaviourIndex),
    S3OriginConfig: {
      OriginAccessIdentity: Join('', [
        'origin-access-identity/cloudfront/',
        Ref(cfLogicalNames.cloudfrontOriginAccessIdentity(stpResourceNameOfReferencer))
      ])
    },
    OriginPath: routePrefix,
    OriginCustomHeaders: (forwardingOptions?.customRequestHeaders || [])
      .map(({ headerName: HeaderName, value: HeaderValue }) => ({ HeaderName, HeaderValue }))
      .concat({ HeaderName: stacktapeCloudfrontHeaders.originType(), HeaderValue: 'bucket' })
      .concat({
        HeaderName: stacktapeCloudfrontHeaders.spaHeader(),
        HeaderValue: rewriteRoutesForSinglePageApp ? 'true' : 'false'
      })
      .concat({
        HeaderName: stacktapeCloudfrontHeaders.urlOptimization(),
        HeaderValue: disableUrlOptimization ? 'false' : 'true'
      })
  });
};

const buildHttpApiOrigin = ({
  stpResourceNameOfReferencer,
  stpHttpApiGatewayReference,
  routePrefix,
  cacheBehaviourIndex,
  forwardingOptions,
  cachingOptions: _
}: {
  stpResourceNameOfReferencer: string;
  stpHttpApiGatewayReference: string;
  routePrefix: string | undefined;
  cacheBehaviourIndex: number;
  forwardingOptions: CdnForwardingOptions | undefined;
  cachingOptions: CdnCachingOptions | undefined;
}): Origin => {
  // we do not need to save result
  // we are only checking if referenced http api gateway really exists
  const { name: httpApiGatewayStpName } = resolveReferenceToHttpApiGateway({
    stpResourceReference: stpHttpApiGatewayReference,
    referencedFrom: stpResourceNameOfReferencer
  });
  return new Origin({
    DomainName: Select(1, Split('//', GetAtt(cfLogicalNames.httpApi(httpApiGatewayStpName), 'ApiEndpoint'))),
    Id: awsResourceNames.cloudfrontOriginId(httpApiGatewayStpName, cacheBehaviourIndex),
    CustomOriginConfig: {
      OriginProtocolPolicy: 'https-only',
      OriginSSLProtocols: ['TLSv1.2'],
      HTTPSPort: 443
    },
    OriginPath: routePrefix,
    OriginCustomHeaders: (forwardingOptions?.customRequestHeaders || [])
      .map(({ headerName: HeaderName, value: HeaderValue }) => ({ HeaderName, HeaderValue }) as OriginCustomHeader)
      .concat([{ HeaderName: stacktapeCloudfrontHeaders.originType(), HeaderValue: 'http-api-gateway' }])
  });
};

const buildLambdaFunctionOrigin = ({
  stpResourceNameOfReferencer,
  stpFunctionReference,
  routePrefix,
  cacheBehaviourIndex,
  forwardingOptions,
  cachingOptions: _
}: {
  stpResourceNameOfReferencer: string;
  stpFunctionReference: string;
  routePrefix: string | undefined;
  cacheBehaviourIndex: number;
  forwardingOptions: CdnForwardingOptions | undefined;
  cachingOptions: CdnCachingOptions | undefined;
}): Origin => {
  // we do not need to save result
  // we are only checking if referenced http api gateway really exists
  const { name: stpFunctionName } = resolveReferenceToLambdaFunction({
    stpResourceReference: stpFunctionReference,
    referencedFrom: stpResourceNameOfReferencer
  });
  return new Origin({
    DomainName: Select(2, Split('/', GetAtt(cfLogicalNames.lambdaUrl(stpFunctionName), 'FunctionUrl'))),
    Id: awsResourceNames.cloudfrontOriginId(stpFunctionName, cacheBehaviourIndex),
    CustomOriginConfig: {
      OriginProtocolPolicy: 'https-only',
      OriginSSLProtocols: ['TLSv1.2'],
      HTTPSPort: 443
    },
    OriginPath: routePrefix,
    OriginCustomHeaders: (forwardingOptions?.customRequestHeaders || [])
      .map(({ headerName: HeaderName, value: HeaderValue }) => ({ HeaderName, HeaderValue }) as OriginCustomHeader)
      .concat([{ HeaderName: stacktapeCloudfrontHeaders.originType(), HeaderValue: 'function' }])
  });
};

const buildCustomDomainOrigin = ({
  targetCustomOriginProperties,
  routePrefix,
  cacheBehaviourIndex,
  forwardingOptions,
  cachingOptions: _
}: {
  targetCustomOriginProperties: CdnCustomOrigin;
  routePrefix: string | undefined;
  cacheBehaviourIndex: number;
  forwardingOptions: CdnForwardingOptions | undefined;
  cachingOptions: CdnCachingOptions | undefined;
}): Origin => {
  const protocol = targetCustomOriginProperties.protocol || 'HTTPS';

  return new Origin({
    DomainName: targetCustomOriginProperties.domainName,
    Id: awsResourceNames.cloudfrontOriginId(targetCustomOriginProperties.domainName, cacheBehaviourIndex),
    CustomOriginConfig: {
      OriginProtocolPolicy: protocol === 'HTTP' ? 'http-only' : 'https-only',
      OriginSSLProtocols: protocol === 'HTTPS' ? ['TLSv1.2'] : undefined,
      HTTPPort: protocol === 'HTTP' ? targetCustomOriginProperties.port || 80 : undefined,
      HTTPSPort: protocol === 'HTTPS' ? targetCustomOriginProperties.port || 443 : undefined
    },
    OriginPath: routePrefix,
    OriginCustomHeaders: (forwardingOptions?.customRequestHeaders || [])
      .map(({ headerName: HeaderName, value: HeaderValue }) => ({ HeaderName, HeaderValue }) as OriginCustomHeader)
      .concat([{ HeaderName: stacktapeCloudfrontHeaders.originType(), HeaderValue: 'custom-origin' }])
  });
};

const buildLoadBalancerOrigin = ({
  stpResourceNameOfReferencer,
  targetLoadBalancerReference,
  routePrefix,
  explicitOriginDomainName,
  cacheBehaviourIndex,
  forwardingOptions,
  cachingOptions: _
}: {
  stpResourceNameOfReferencer: string | undefined;
  targetLoadBalancerReference: ApplicationLoadBalancerIntegrationProps;
  routePrefix: string | undefined;
  explicitOriginDomainName: string | undefined;
  cacheBehaviourIndex: number;
  forwardingOptions: CdnForwardingOptions | undefined;
  cachingOptions: CdnCachingOptions | undefined;
}): Origin => {
  const resolvedReference = resolveReferenceToApplicationLoadBalancer(
    targetLoadBalancerReference,
    stpResourceNameOfReferencer
  );
  const lbOriginProps = determineLoadBalancerOriginProperties(resolvedReference, explicitOriginDomainName);

  return new Origin({
    DomainName: lbOriginProps.originDomainName,
    Id: awsResourceNames.cloudfrontOriginId(resolvedReference.loadBalancer.name, cacheBehaviourIndex),
    CustomOriginConfig: {
      OriginProtocolPolicy: lbOriginProps.originProtocol === 'HTTP' ? 'http-only' : 'https-only',
      OriginSSLProtocols: lbOriginProps.originProtocol === 'HTTPS' ? ['TLSv1.2'] : undefined,
      HTTPPort: lbOriginProps.originProtocol === 'HTTP' ? lbOriginProps.originPort : undefined,
      HTTPSPort: lbOriginProps.originProtocol === 'HTTPS' ? lbOriginProps.originPort : undefined
    },
    OriginPath: routePrefix,
    OriginCustomHeaders: (forwardingOptions?.customRequestHeaders || [])
      .map(({ headerName: HeaderName, value: HeaderValue }) => ({ HeaderName, HeaderValue }) as OriginCustomHeader)
      .concat([{ HeaderName: stacktapeCloudfrontHeaders.originType(), HeaderValue: 'application-load-balancer' }])
  });
};

const determineLoadBalancerOriginProperties = (
  listenerReference: StpResolvedLoadBalancerReference,
  originDomainName: string | undefined
): { originDomainName: string | IntrinsicFunction; originProtocol: 'HTTP' | 'HTTPS'; originPort: number } => {
  return {
    originDomainName:
      originDomainName ||
      listenerReference.loadBalancer.customDomains?.[0] ||
      domainManager.getDefaultDomainForResource({ stpResourceName: listenerReference.loadBalancer.name }),
    originProtocol: listenerReference.protocol,
    originPort: listenerReference.listenerPort
  };
};

const formatCacheCookiesConfig = (
  cookiesConfig: CdnCachingOptions['cacheKeyParameters']['cookies'],
  stpResourceNameName: string
): CacheCookiesConfig => {
  const allowedValuesInCookieConfig: (keyof CdnCachingOptions['cacheKeyParameters']['cookies'])[] = [
    'all',
    'allExcept',
    'none',
    'whitelist'
  ];
  if (
    Object.keys(cookiesConfig).length !== 1 ||
    !allowedValuesInCookieConfig.includes(
      getConfigBehaviour(cookiesConfig) as keyof CdnCachingOptions['cacheKeyParameters']['cookies']
    )
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${stpResourceNameName}.\n` +
        `You have to define exactly one of ${allowedValuesInCookieConfig.map(
          (allowedValue) => `"${allowedValue}", `
        )}properties in cacheOptions.cacheKeyParameters.cookies`
    );
  }
  const cookieBehaviour = Object.keys(cookiesConfig)[0];
  return new CacheCookiesConfig({
    CookieBehavior: cookieBehaviour,
    Cookies:
      cookieBehaviour === 'allExcept' || cookieBehaviour === 'whitelist' ? cookiesConfig[cookieBehaviour] : undefined
  });
};

const formatCacheHeadersConfig = (
  headersConfig: CdnCachingOptions['cacheKeyParameters']['headers'],
  stpResourceNameName: string
): CacheHeadersConfig => {
  const allowedValuesInHeadersConfig: (keyof CdnCachingOptions['cacheKeyParameters']['headers'])[] = [
    'none',
    'whitelist'
  ];
  if (
    Object.keys(headersConfig).length !== 1 ||
    !allowedValuesInHeadersConfig.includes(
      getConfigBehaviour(headersConfig) as keyof CdnCachingOptions['cacheKeyParameters']['headers']
    )
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${stpResourceNameName}.\n` +
        `You have to define exactly one of ${allowedValuesInHeadersConfig.map(
          (allowedValue) => `"${allowedValue}", `
        )}properties in cacheOptions.cacheKeyParameters.headers`
    );
  }
  const headerBehaviour = Object.keys(headersConfig)[0];
  return new CacheHeadersConfig({
    HeaderBehavior: headerBehaviour,
    Headers: headerBehaviour === 'whitelist' ? headersConfig[headerBehaviour] : undefined
  });
};

const formatCacheQueryStringConfig = (
  queryStringsConfig: CdnCachingOptions['cacheKeyParameters']['queryString'],
  stpResourceNameName: string
): CacheQueryStringsConfig => {
  const allowedValuesInQueryStringsConfig: (keyof CdnCachingOptions['cacheKeyParameters']['queryString'])[] = [
    'none',
    'whitelist',
    'all'
  ];
  if (
    Object.keys(queryStringsConfig).length !== 1 ||
    !allowedValuesInQueryStringsConfig.includes(
      getConfigBehaviour(queryStringsConfig) as keyof CdnCachingOptions['cacheKeyParameters']['queryString']
    )
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${stpResourceNameName}.\n` +
        `You have to define exactly one of ${allowedValuesInQueryStringsConfig.map(
          (allowedValue) => `"${allowedValue}", `
        )}properties in cacheOptions.cacheKeyParameters.queryString`
    );
  }
  const queryStringBehaviour = Object.keys(queryStringsConfig)[0];
  return new CacheQueryStringsConfig({
    QueryStringBehavior: queryStringBehaviour,
    QueryStrings: queryStringBehaviour === 'whitelist' ? queryStringsConfig[queryStringBehaviour] : undefined
  });
};

const formatOriginRequestCookiesConfig = (
  cookiesConfig: CdnForwardingOptions['cookies'],
  stpResourceNameName: string
): OriginRequestCookiesConfig => {
  const allowedValuesInCookieConfig: (keyof CdnForwardingOptions['cookies'])[] = ['all', 'none', 'whitelist'];
  if (
    Object.keys(cookiesConfig).length !== 1 ||
    !allowedValuesInCookieConfig.includes(getConfigBehaviour(cookiesConfig) as keyof CdnForwardingOptions['cookies'])
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${stpResourceNameName}.\n` +
        `You have to define exactly one of ${allowedValuesInCookieConfig.map(
          (allowedValue) => `"${allowedValue}", `
        )}properties in forwardingOptions.cookies`
    );
  }
  const cookieBehaviour = Object.keys(cookiesConfig)[0];
  return new CacheCookiesConfig({
    CookieBehavior: cookieBehaviour,
    Cookies: cookieBehaviour === 'whitelist' ? cookiesConfig[cookieBehaviour] : undefined
  });
};

const formatOriginRequestHeadersConfig = (
  headersConfig: CdnForwardingOptions['headers'],
  stpResourceNameName: string
): OriginRequestHeadersConfig => {
  const allowedValuesInHeadersConfig: (keyof CdnForwardingOptions['headers'])[] = [
    'none',
    'whitelist',
    'allViewer',
    'allViewerAndWhitelistCloudFront'
  ];
  if (
    Object.keys(headersConfig).length !== 1 ||
    !allowedValuesInHeadersConfig.includes(getConfigBehaviour(headersConfig) as keyof CdnForwardingOptions['headers'])
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${stpResourceNameName}.\n` +
        `You have to define exactly one of ${allowedValuesInHeadersConfig.map(
          (allowedValue) => `"${allowedValue}", `
        )}properties in forwardingOptions.headers`
    );
  }
  const headerBehaviour = Object.keys(headersConfig)[0];
  return new CacheHeadersConfig({
    HeaderBehavior: headerBehaviour,
    Headers:
      headerBehaviour === 'allViewerAndWhitelistCloudFront' || headerBehaviour === 'whitelist'
        ? headersConfig[headerBehaviour]
        : undefined
  });
};

const formatOriginRequestQueryStringConfig = (
  queryStringsConfig: CdnForwardingOptions['queryString'],
  stpResourceNameName: string
): OriginRequestQueryStringsConfig => {
  const allowedValuesInQueryStringsConfig: (keyof CdnForwardingOptions['queryString'])[] = ['none', 'whitelist', 'all'];
  if (
    Object.keys(queryStringsConfig).length !== 1 ||
    !allowedValuesInQueryStringsConfig.includes(
      getConfigBehaviour(queryStringsConfig) as keyof CdnForwardingOptions['queryString']
    )
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${stpResourceNameName}.\n` +
        `You have to define exactly one of ${allowedValuesInQueryStringsConfig.map(
          (allowedValue) => `"${allowedValue}", `
        )}properties in forwardingOptions.queryString`
    );
  }
  const queryStringBehaviour = Object.keys(queryStringsConfig)[0];
  return new CacheQueryStringsConfig({
    QueryStringBehavior: queryStringBehaviour,
    QueryStrings: queryStringBehaviour === 'whitelist' ? queryStringsConfig[queryStringBehaviour] : undefined
  });
};

export const getCloudfrontOriginAccessIdentityResource = (stpResourceNameName: string) =>
  new CloudfrontOriginAccessIdentity({
    CloudFrontOriginAccessIdentityConfig: { Comment: `${stpResourceNameName} attached distros - Access Identity` }
  });

export const getCloudfrontDistributionConfigs = (cdnCompatibleResource: StpCdnCompatibleResource) => {
  const cloudfrontDistributions: {
    [apexDomain: string]: { domains: Set<string>; certificateArn: string; disableDns: boolean };
  } = {};
  cdnCompatibleResource.cdn.customDomains.forEach((domainConfig) => {
    const apexDomain = getApexDomain(domainConfig.domainName);
    if (apexDomain in cloudfrontDistributions) {
      cloudfrontDistributions[apexDomain].domains.add(domainConfig.domainName);
    } else {
      cloudfrontDistributions[apexDomain] = {
        disableDns: domainConfig.disableDnsRecordCreation,
        certificateArn:
          domainConfig.customCertificateArn || domainManager.getCertificateForDomain(domainConfig.domainName, 'cdn'),
        domains: new Set([domainConfig.domainName])
      };
    }
  });
  return cloudfrontDistributions;
};

export const getCloudfrontDistributionResource = ({
  cdnCompatibleResource,
  certificateArn,
  defaultOriginType,
  customDomains,
  stpResourceName
}: {
  stpResourceName: string;
  cdnCompatibleResource: StpCdnCompatibleResource;
  defaultOriginType: StpCdnAttachableResourceType;
  customDomains: string[] | undefined;
  certificateArn: string | IntrinsicFunction | undefined;
}) => {
  let defaultCacheBehaviour;
  switch (defaultOriginType) {
    case 'bucket': {
      defaultCacheBehaviour = buildBucketCacheBehaviour({
        cachingOptions: cdnCompatibleResource.cdn.cachingOptions,
        forwardingOptions: cdnCompatibleResource.cdn.forwardingOptions,
        stpResourceName,
        stpTargetBucketReference: cdnCompatibleResource.nameChain.join('.'),
        disableUrlNormalization: (cdnCompatibleResource as StpBucket).cdn.disableUrlNormalization,
        rewriteRoutesForSinglePageApp: (cdnCompatibleResource as StpBucket).cdn.rewriteRoutesForSinglePageApp,
        edgeFunctions: cdnCompatibleResource.cdn.edgeFunctions,
        cacheBehaviourIndex: 0
      });
      break;
    }
    case 'http-api-gateway': {
      defaultCacheBehaviour = buildHttpApiGatewayCacheBehaviour({
        cachingOptions: cdnCompatibleResource.cdn.cachingOptions,
        forwardingOptions: cdnCompatibleResource.cdn.forwardingOptions,
        stpResourceName,
        stpHttpApiGatewayReference: cdnCompatibleResource.nameChain.join('.'),
        edgeFunctions: cdnCompatibleResource.cdn.edgeFunctions,
        cacheBehaviourIndex: 0
      });
      break;
    }
    case 'function': {
      defaultCacheBehaviour = buildLambdaFunctionCacheBehaviour({
        cachingOptions: cdnCompatibleResource.cdn.cachingOptions,
        forwardingOptions: cdnCompatibleResource.cdn.forwardingOptions,
        stpResourceName,
        stpLambdaFunctionReference: cdnCompatibleResource.nameChain.join('.'),
        edgeFunctions: cdnCompatibleResource.cdn.edgeFunctions,
        cacheBehaviourIndex: 0
      });
      break;
    }
    case 'application-load-balancer': {
      defaultCacheBehaviour = buildLoadBalancerCacheBehaviour({
        cachingOptions: cdnCompatibleResource.cdn.cachingOptions,
        forwardingOptions: cdnCompatibleResource.cdn.forwardingOptions,
        stpResourceName,
        targetLoadBalancerReference: {
          loadBalancerName: cdnCompatibleResource.nameChain.join('.'),
          listenerPort: (cdnCompatibleResource as StpApplicationLoadBalancer).cdn.listenerPort
        } as ApplicationLoadBalancerIntegrationProps,

        edgeFunctions: cdnCompatibleResource.cdn.edgeFunctions,
        cacheBehaviourIndex: 0
      });
      break;
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const originType: never = defaultOriginType;
    }
  }
  const distributionConfig: DistributionConfig = {
    Aliases: customDomains,
    DefaultCacheBehavior: defaultCacheBehaviour,
    CustomErrorResponses: getCustomErrorResponses(cdnCompatibleResource),
    DefaultRootObject:
      cdnCompatibleResource.cdn.indexDocument || defaultOriginType === 'bucket'
        ? normalizePathForCloudfrontDistribution(
            'rootDocument',
            cdnCompatibleResource.cdn.indexDocument || 'index.html'
          )
        : undefined,
    Enabled: true,
    HttpVersion: 'http2and3',
    IPV6Enabled: true,
    CacheBehaviors: getCacheBehavioursForRouteRewrites({
      cdnCompatibleResource
    }),
    Origins: getOriginsForDistribution(cdnCompatibleResource),
    PriceClass: cdnCompatibleResource.cdn.cloudfrontPriceClass,
    ViewerCertificate: {
      MinimumProtocolVersion: certificateArn && 'TLSv1.2_2018',
      AcmCertificateArn: certificateArn,
      CloudFrontDefaultCertificate: !certificateArn ? true : undefined,
      SslSupportMethod: certificateArn && 'sni-only'
    }
  };

  if (cdnCompatibleResource.cdn?.useFirewall) {
    resolveReferenceToFirewall({
      referencedFrom: cdnCompatibleResource.name,
      referencedFromType: cdnCompatibleResource.configParentResourceType as StpCdnAttachableResourceType,
      stpResourceReference: cdnCompatibleResource.cdn.useFirewall
    });
    // although it's called WebACLId, it actually needs the ARN of the firewall
    distributionConfig.WebACLId = GetAtt(
      cfLogicalNames.webAppFirewallCustomResource(cdnCompatibleResource.cdn.useFirewall),
      'Arn'
    );
  }

  const resource = new CloudfrontDistribution({
    DistributionConfig: distributionConfig
  });

  return resource;
};

const getCustomErrorResponses = (cdnCompatibleResource: StpCdnCompatibleResource) => {
  return cdnCompatibleResource.cdn.errorDocument || cdnCompatibleResource.type === 'bucket'
    ? [
        // {
        //   ErrorCode: 403,
        //   ResponseCode: 403,
        //   ResponsePagePath: normalizePathForCloudfrontDistribution(
        //     'errorDocument',
        //     cdnCompatibleResource.cdn.errorDocument || cdnCompatibleResource.cdn.indexDocument || 'index.html'
        //   )
        // },
        {
          ErrorCode: 404,
          ResponseCode: 404,
          ResponsePagePath: normalizePathForCloudfrontDistribution(
            'errorDocument',
            (cdnCompatibleResource as StpBucket).cdn.rewriteRoutesForSinglePageApp
              ? 'index.html'
              : cdnCompatibleResource.cdn.errorDocument || '404.html'
          )
        }
        // {
        //   ErrorCode: 500,
        //   ResponseCode: 500,
        //   ResponsePagePath: normalizePathForCloudfrontDistribution(
        //     'errorDocument',
        //     cdnCompatibleResource.cdn.errorDocument || cdnCompatibleResource.cdn.indexDocument || 'index.html'
        //   )
        // }
      ]
    : undefined;
};

const resolveCdnAttachableFunction = ({
  stpResourceReferenceOrArn,
  referencedFromType,
  referencedFrom
}: {
  stpResourceReferenceOrArn: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}) => {
  if (
    // if it is a string that is in arn shape
    typeof stpResourceReferenceOrArn === 'string' &&
    stpResourceReferenceOrArn.startsWith('arn:')
  ) {
    if (stpResourceReferenceOrArn.startsWith('arn:aws:lambda')) {
      // @todo add some validation that this is indeed correct arn
      return { edgeLambdaVersionArn: stpResourceReferenceOrArn } as EdgeLambdaReferencedUsingArn;
    }
    return { cloudfrontFunctionArn: stpResourceReferenceOrArn } as CloudfrontFunctionReferencedUsingArn;
  }
  // if it is not string, we assume IntrinsicFunction
  // further we assume we are trying to reference Arn of Cloudfront Function
  // this can change in future, but should not be a breaking change
  if (typeof stpResourceReferenceOrArn !== 'string') {
    return { cloudfrontFunctionArn: stpResourceReferenceOrArn } as CloudfrontFunctionReferencedUsingArn;
  }
  return resolveReferenceToEdgeLambdaFunction({
    stpResourceReference: stpResourceReferenceOrArn,
    referencedFrom,
    referencedFromType
  });
};

const getCustomEdgeFunctionsAssociations = ({
  edgeFunctions,
  stpResourceName
}: {
  edgeFunctions: CdnConfiguration['edgeFunctions'];
  stpResourceName: string;
}) => {
  const edgeLambdaFunctions: LambdaFunctionAssociation[] = [];
  const cloudfrontFunctions: FunctionAssociation[] = [];
  (Object.entries(edgeFunctions || {}) as Entries<EdgeFunctionsConfig>)
    .filter(([, stpFunctionNameOrArn]) => stpFunctionNameOrArn)
    .forEach(([triggerType, stpFunctionNameOrArn]) => {
      // resolving reference only to check the existence of the function
      const resolvedReference = resolveCdnAttachableFunction({
        stpResourceReferenceOrArn: stpFunctionNameOrArn,
        referencedFrom: stpResourceName
      });
      // @todo add some validations that the cloudfront functions are not used with "origin" event types
      let eventType: 'viewer-request' | 'viewer-response' | 'origin-request' | 'origin-response';
      switch (triggerType) {
        case 'onRequest': {
          eventType = 'viewer-request';
          break;
        }
        case 'onResponse': {
          eventType = 'viewer-response';
          break;
        }
        case 'onOriginRequest': {
          eventType = 'origin-request';
          break;
        }
        case 'onOriginResponse': {
          eventType = 'origin-response';
          break;
        }
        default: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const exhaustiveCheck: never = triggerType;
        }
      }
      if ((resolvedReference as CloudfrontFunctionReferencedUsingArn).cloudfrontFunctionArn) {
        cloudfrontFunctions.push(
          new FunctionAssociation({
            EventType: eventType,
            FunctionARN: (resolvedReference as CloudfrontFunctionReferencedUsingArn).cloudfrontFunctionArn
          })
        );
      } else {
        edgeLambdaFunctions.push(
          new LambdaFunctionAssociation({
            EventType: eventType,
            IncludeBody: eventType === 'viewer-request' || eventType === 'origin-request',
            LambdaFunctionARN:
              (resolvedReference as EdgeLambdaReferencedUsingArn).edgeLambdaVersionArn ||
              GetAtt(cfLogicalNames.customResourceEdgeLambda(stpFunctionNameOrArn), 'versionArn')
          })
        );
      }
    });
  return { edgeLambdaFunctions, cloudfrontFunctions };
};

const determineEdgeFunctionAssociationsForBucketCacheBehaviour = ({
  disableUrlNormalization,
  rewriteRoutesForSinglePageApp,
  needsOriginResponseLambda,
  edgeFunctions,
  stpResourceName
}: {
  disableUrlNormalization: boolean;
  rewriteRoutesForSinglePageApp: boolean;
  needsOriginResponseLambda: boolean;
  edgeFunctions: CdnConfiguration['edgeFunctions'];
  stpResourceName: string;
}): {
  edgeLambdaFunctions: CacheBehavior['LambdaFunctionAssociations'];
  cloudfrontFunctions: CacheBehavior['FunctionAssociations'];
} => {
  const { cloudfrontFunctions, edgeLambdaFunctions } = getCustomEdgeFunctionsAssociations({
    stpResourceName,
    edgeFunctions
  });
  const filteredPredefinedAssociations: LambdaFunctionAssociation[] = []
    .concat(
      !disableUrlNormalization || rewriteRoutesForSinglePageApp
        ? {
            EventType: 'origin-request',
            IncludeBody: false,
            LambdaFunctionARN: GetAtt(
              cfLogicalNames.customResourceEdgeLambda(configManager.stacktapeOriginRequestLambdaProps.name),
              'versionArn'
            )
          }
        : []
    )
    .concat(
      needsOriginResponseLambda
        ? [
            {
              EventType: 'origin-response',
              IncludeBody: false,
              LambdaFunctionARN: GetAtt(
                cfLogicalNames.customResourceEdgeLambda(configManager.stacktapeOriginResponseLambdaProps.name),
                'versionArn'
              )
            }
          ]
        : []
    )
    .filter(
      ({ EventType }) =>
        ![...cloudfrontFunctions, ...edgeLambdaFunctions].some(
          ({ EventType: AlreadyUsedEventType }) => AlreadyUsedEventType === EventType
        )
    );
  return { cloudfrontFunctions, edgeLambdaFunctions: [...edgeLambdaFunctions, ...filteredPredefinedAssociations] };
};

// const determineLambdaAssociationsForCustomOriginCacheBehaviour = ({
//   cachingOptions,
//   forwardingOptions,
//   targetCustomOriginProperties,
//   edgeFunctions,
//   stpResourceName
// }: {
//   cachingOptions: CdnConfiguration['cachingOptions'] | undefined;
//   forwardingOptions: CdnConfiguration['forwardingOptions'] | undefined;
//   targetCustomOriginProperties: CdnCustomOrigin;
//   edgeFunctions: CdnConfiguration['edgeFunctions'];
//   stpResourceName: string;
// }): CacheBehavior['LambdaFunctionAssociations'] => {
//   const protocol = targetCustomOriginProperties.protocol || 'HTTPS';
//   const customAssociations = getCustomLambdaAssociations({ stpResourceName, edgeFunctions });
//   const filteredPredefinedAssociations: LambdaFunctionAssociation[] = []
//     .concat(
//       isHostHeaderRewriteNeeded({
//         originType: 'custom-origin',
//         cachingOptions,
//         forwardingOptions,
//         originProtocol: protocol
//       })
//         ? {
//             EventType: 'origin-request',
//             IncludeBody: false,
//             LambdaFunctionARN: GetAtt(
//               cfLogicalNames.customResourceEdgeLambda(configManager.stacktapeOriginRequestLambdaProps.name),
//               'versionArn'
//             )
//           }
//         : []
//     )
//     .filter(
//       ({ EventType }) =>
//         !customAssociations.some(({ EventType: AlreadyUsedEventType }) => AlreadyUsedEventType === EventType)
//     );
//   return [...customAssociations, ...filteredPredefinedAssociations];
// };

const buildBucketCacheBehaviour = ({
  cachingOptions,
  forwardingOptions,
  edgeFunctions,
  stpResourceName,
  stpTargetBucketReference,
  disableUrlNormalization,
  rewriteRoutesForSinglePageApp,
  cacheBehaviourIndex
}: {
  cachingOptions: CdnConfiguration['cachingOptions'] | undefined;
  forwardingOptions: CdnConfiguration['forwardingOptions'] | undefined;
  edgeFunctions: CdnConfiguration['edgeFunctions'] | undefined;
  stpResourceName: string;
  stpTargetBucketReference: string;
  disableUrlNormalization: boolean;
  rewriteRoutesForSinglePageApp: boolean;
  cacheBehaviourIndex: number;
}) => {
  const { name: stpBucketName } = resolveReferenceToBucket({
    stpResourceReference: stpTargetBucketReference,
    referencedFrom: stpResourceName
  });
  const { cloudfrontFunctions, edgeLambdaFunctions } = determineEdgeFunctionAssociationsForBucketCacheBehaviour({
    disableUrlNormalization,
    rewriteRoutesForSinglePageApp,
    needsOriginResponseLambda: configManager.allBucketsUsingCustomMetadataHeaders.includes(stpBucketName),
    edgeFunctions,
    stpResourceName
  });
  return getCacheBehaviour({
    cachingOptions,
    forwardingOptions,
    stpResourceName,
    stpTargetOriginName: stpBucketName,
    targetOriginType: 'bucket',
    viewerProtocolPolicy: 'redirect-to-https',
    lambdaAssociations: edgeLambdaFunctions,
    functionAssociations: cloudfrontFunctions,
    cacheBehaviourIndex,
    stackName: globalStateManager.targetStack.stackName
  });
};

const buildHttpApiGatewayCacheBehaviour = ({
  cachingOptions,
  forwardingOptions,
  edgeFunctions,
  stpResourceName,
  stpHttpApiGatewayReference,
  cacheBehaviourIndex
}: {
  cachingOptions: CdnConfiguration['cachingOptions'] | undefined;
  forwardingOptions: CdnConfiguration['forwardingOptions'] | undefined;
  edgeFunctions: CdnConfiguration['edgeFunctions'] | undefined;
  stpResourceName: string;
  stpHttpApiGatewayReference: string;
  cacheBehaviourIndex: number;
}) => {
  const { name: stpHttpApiGatewayName } = resolveReferenceToHttpApiGateway({
    stpResourceReference: stpHttpApiGatewayReference,
    referencedFrom: stpResourceName
  });
  const { cloudfrontFunctions, edgeLambdaFunctions } = getCustomEdgeFunctionsAssociations({
    stpResourceName,
    edgeFunctions
  });
  return getCacheBehaviour({
    cachingOptions,
    forwardingOptions,
    stpResourceName,
    stpTargetOriginName: stpHttpApiGatewayName,
    lambdaAssociations: edgeLambdaFunctions,
    functionAssociations: cloudfrontFunctions,
    targetOriginType: 'http-api-gateway',
    viewerProtocolPolicy: 'redirect-to-https',
    cacheBehaviourIndex,
    stackName: globalStateManager.targetStack.stackName
  });
};

const buildLambdaFunctionCacheBehaviour = ({
  cachingOptions,
  forwardingOptions,
  edgeFunctions,
  stpResourceName,
  stpLambdaFunctionReference,
  cacheBehaviourIndex
}: {
  cachingOptions: CdnConfiguration['cachingOptions'] | undefined;
  forwardingOptions: CdnConfiguration['forwardingOptions'] | undefined;
  edgeFunctions: CdnConfiguration['edgeFunctions'] | undefined;
  stpResourceName: string;
  stpLambdaFunctionReference: string;
  cacheBehaviourIndex: number;
}) => {
  const { name: stpLambdaFunctionName } = resolveReferenceToLambdaFunction({
    stpResourceReference: stpLambdaFunctionReference,
    referencedFrom: stpResourceName
  });
  const { cloudfrontFunctions, edgeLambdaFunctions } = getCustomEdgeFunctionsAssociations({
    stpResourceName,
    edgeFunctions
  });

  return getCacheBehaviour({
    cachingOptions,
    forwardingOptions,
    stpResourceName,
    stpTargetOriginName: stpLambdaFunctionName,
    lambdaAssociations: edgeLambdaFunctions,
    functionAssociations: cloudfrontFunctions,
    targetOriginType: 'function',
    viewerProtocolPolicy: 'redirect-to-https',
    cacheBehaviourIndex,
    stackName: globalStateManager.targetStack.stackName
  });
};

const buildLoadBalancerCacheBehaviour = ({
  cachingOptions,
  forwardingOptions,
  edgeFunctions,
  stpResourceName,
  targetLoadBalancerReference,
  cacheBehaviourIndex
}: {
  cachingOptions: CdnConfiguration['cachingOptions'] | undefined;
  forwardingOptions: CdnConfiguration['forwardingOptions'] | undefined;
  edgeFunctions: CdnConfiguration['edgeFunctions'] | undefined;
  stpResourceName: string;
  targetLoadBalancerReference: ApplicationLoadBalancerIntegrationProps;
  cacheBehaviourIndex: number;
}) => {
  const resolvedLbReference = resolveReferenceToApplicationLoadBalancer(targetLoadBalancerReference, stpResourceName);

  const { cloudfrontFunctions, edgeLambdaFunctions } = getCustomEdgeFunctionsAssociations({
    stpResourceName,
    edgeFunctions
  });

  return getCacheBehaviour({
    cachingOptions,
    forwardingOptions,
    stpResourceName,
    stpTargetOriginName: resolvedLbReference.loadBalancer.name,
    lambdaAssociations: edgeLambdaFunctions,
    functionAssociations: cloudfrontFunctions,
    targetOriginType: 'application-load-balancer',
    viewerProtocolPolicy: 'redirect-to-https',
    cacheBehaviourIndex,
    stackName: globalStateManager.targetStack.stackName
  });
};

const buildCustomOriginCacheBehaviour = ({
  cachingOptions,
  forwardingOptions,
  edgeFunctions,
  stpResourceName,
  targetCustomOriginProperties,
  cacheBehaviourIndex
}: {
  cachingOptions: CdnConfiguration['cachingOptions'] | undefined;
  forwardingOptions: CdnConfiguration['forwardingOptions'] | undefined;
  edgeFunctions: CdnConfiguration['edgeFunctions'] | undefined;
  stpResourceName: string;
  targetCustomOriginProperties: CdnCustomOrigin;
  cacheBehaviourIndex: number;
}) => {
  const { cloudfrontFunctions, edgeLambdaFunctions } = getCustomEdgeFunctionsAssociations({
    stpResourceName,
    edgeFunctions
  });
  return getCacheBehaviour({
    cachingOptions,
    forwardingOptions,
    stpResourceName,
    stpTargetOriginName: targetCustomOriginProperties.domainName,
    lambdaAssociations: edgeLambdaFunctions,
    functionAssociations: cloudfrontFunctions,
    targetOriginType: 'custom-origin',
    viewerProtocolPolicy: 'redirect-to-https',
    cacheBehaviourIndex,
    stackName: globalStateManager.targetStack.stackName
  });
};

const getCacheBehaviour = ({
  cachingOptions,
  forwardingOptions,
  stpResourceName,
  stpTargetOriginName,
  targetOriginType,
  viewerProtocolPolicy,
  lambdaAssociations,
  functionAssociations,
  // default cache behaviour has index 0. route rewrite behaviours start with 1.
  cacheBehaviourIndex,
  stackName
}: {
  cachingOptions: CdnConfiguration['cachingOptions'];
  forwardingOptions: CdnConfiguration['forwardingOptions'];
  stpResourceName: string;
  stpTargetOriginName: string;
  targetOriginType: StpCdnOriginTargetableByRouteRewrite;
  viewerProtocolPolicy: CacheBehavior['ViewerProtocolPolicy'];
  lambdaAssociations?: CacheBehavior['LambdaFunctionAssociations'];
  functionAssociations?: CacheBehavior['FunctionAssociations'];
  cacheBehaviourIndex: number;
  stackName: string;
}) => {
  return new DefaultCacheBehavior({
    AllowedMethods:
      forwardingOptions?.allowedMethods ||
      (targetOriginType === 'bucket'
        ? ['GET', 'HEAD', 'OPTIONS']
        : ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']),
    CachedMethods: cachingOptions?.cacheMethods ||
      forwardingOptions?.allowedMethods?.filter((method) => ['GET', 'HEAD', 'OPTIONS'].includes(method)) || [
        'GET',
        'HEAD',
        'OPTIONS'
      ],
    CachePolicyId:
      cachingOptions?.cachePolicyId ||
      Ref(
        isCustomCachePolicyNeeded({ cachingOptions, originType: targetOriginType, stackName })
          ? cfLogicalNames.cloudfrontCustomCachePolicy(stpResourceName, getCachePolicyHash({ cachingOptions }))
          : cfLogicalNames.cloudfrontDefaultCachePolicy(targetOriginType === 'bucket' ? 'DefStatic' : 'DefDynamic')
      ),
    Compress: !cachingOptions?.disableCompression,
    OriginRequestPolicyId:
      forwardingOptions?.originRequestPolicyId ||
      Ref(
        isCustomOriginRequestPolicyNeeded({
          forwardingOptions,
          originType: targetOriginType,
          stackName
        })
          ? cfLogicalNames.cloudfrontCustomOriginRequestPolicy(
              stpResourceName,
              getOriginRequestPolicyHash({ forwardingOptions })
            )
          : cfLogicalNames.cloudfrontDefaultOriginRequestPolicy(
              targetOriginType === 'bucket' ? 'DefStatic' : 'DefDynamic'
            )
      ),
    TargetOriginId: awsResourceNames.cloudfrontOriginId(stpTargetOriginName, cacheBehaviourIndex),
    ViewerProtocolPolicy: viewerProtocolPolicy,
    LambdaFunctionAssociations: lambdaAssociations,
    FunctionAssociations: functionAssociations
  });
};

const getCacheBehavioursForRouteRewrites = ({
  cdnCompatibleResource
}: {
  cdnCompatibleResource: StpCdnCompatibleResource;
}): CacheBehavior[] => {
  return cdnCompatibleResource.cdn.routeRewrites?.map((routeRewrite, index) => {
    // const routeRewriteType = determineTypeOfRouteRewrite(routeRewrite, stpResourceName);
    const cacheBehaviourIndex = index + 1;
    if (routeRewrite.routeTo?.type === 'bucket' || (!routeRewrite.routeTo && cdnCompatibleResource.type === 'bucket')) {
      return {
        ...buildBucketCacheBehaviour({
          cachingOptions: routeRewrite.cachingOptions,
          forwardingOptions: routeRewrite.forwardingOptions,
          stpResourceName: cdnCompatibleResource.name,
          stpTargetBucketReference: !routeRewrite.routeTo
            ? cdnCompatibleResource.nameChain.join('.')
            : (routeRewrite.routeTo as CdnBucketRoute).properties.bucketName,
          disableUrlNormalization: (routeRewrite.routeTo as CdnBucketRoute)?.properties.disableUrlNormalization,
          rewriteRoutesForSinglePageApp: false,
          edgeFunctions: routeRewrite.edgeFunctions,
          cacheBehaviourIndex
        }),
        PathPattern: routeRewrite.path
      };
    }
    if (
      routeRewrite.routeTo?.type === 'application-load-balancer' ||
      (!routeRewrite.routeTo && cdnCompatibleResource.type === 'application-load-balancer')
    ) {
      return {
        ...buildLoadBalancerCacheBehaviour({
          cachingOptions: routeRewrite.cachingOptions,
          forwardingOptions: routeRewrite.forwardingOptions,
          stpResourceName: cdnCompatibleResource.name,
          targetLoadBalancerReference: (!routeRewrite.routeTo
            ? {
                loadBalancerName: cdnCompatibleResource.nameChain.join('.'),
                listenerPort: (cdnCompatibleResource as StpApplicationLoadBalancer).cdn.listenerPort
              }
            : {
                loadBalancerName: (routeRewrite.routeTo as CdnLoadBalancerRoute).properties.loadBalancerName,
                listenerPort: (routeRewrite.routeTo as CdnLoadBalancerRoute).properties.listenerPort
              }) as ApplicationLoadBalancerIntegrationProps,
          edgeFunctions: routeRewrite.edgeFunctions,
          cacheBehaviourIndex
        }),
        PathPattern: routeRewrite.path
      };
    }
    if (
      routeRewrite.routeTo?.type === 'http-api-gateway' ||
      (!routeRewrite.routeTo && cdnCompatibleResource.type === 'http-api-gateway')
    ) {
      return {
        ...buildHttpApiGatewayCacheBehaviour({
          cachingOptions: routeRewrite.cachingOptions,
          forwardingOptions: routeRewrite.forwardingOptions,
          stpResourceName: cdnCompatibleResource.name,
          stpHttpApiGatewayReference: !routeRewrite.routeTo
            ? cdnCompatibleResource.nameChain.join('.')
            : (routeRewrite.routeTo as CdnHttpApiGatewayRoute).properties.httpApiGatewayName,
          edgeFunctions: routeRewrite.edgeFunctions,
          cacheBehaviourIndex
        }),
        PathPattern: routeRewrite.path
      };
    }
    if (
      routeRewrite.routeTo?.type === 'function' ||
      (!routeRewrite.routeTo && cdnCompatibleResource.type === 'function')
    ) {
      return {
        ...buildLambdaFunctionCacheBehaviour({
          cachingOptions: routeRewrite.cachingOptions,
          forwardingOptions: routeRewrite.forwardingOptions,
          stpResourceName: cdnCompatibleResource.name,
          stpLambdaFunctionReference: !routeRewrite.routeTo
            ? cdnCompatibleResource.nameChain.join('.')
            : (routeRewrite.routeTo as CdnLambdaFunctionRoute).properties.functionName,
          edgeFunctions: routeRewrite.edgeFunctions,
          cacheBehaviourIndex
        }),
        PathPattern: routeRewrite.path
      };
    }
    if (routeRewrite.routeTo?.type === 'custom-origin') {
      return {
        ...buildCustomOriginCacheBehaviour({
          cachingOptions: routeRewrite.cachingOptions,
          forwardingOptions: routeRewrite.forwardingOptions,
          stpResourceName: cdnCompatibleResource.name,
          targetCustomOriginProperties: routeRewrite.routeTo.properties,
          edgeFunctions: routeRewrite.edgeFunctions,
          cacheBehaviourIndex
        }),
        PathPattern: routeRewrite.path
      };
    }
    throw new UnexpectedError({
      customMessage: `Invalid cdn route rewrite shape in "${cdnCompatibleResource.nameChain.join(
        '.'
      )}".\n${JSON.stringify(routeRewrite, null, 2)}`
    });
  });
};

const normalizePathForCloudfrontDistribution = (type: 'rootDocument' | 'errorDocument', path: string) => {
  if (type === 'rootDocument') {
    if (path.startsWith('/')) {
      return path.slice(1);
    }
    return path;
  }
  if (type === 'errorDocument') {
    if (!path.startsWith('/')) {
      return `/${path}`;
    }
    return path;
  }
};

export const getCloudfrontDnsRecord = (
  domainName: string,
  resource: StpCdnCompatibleResource,
  cloudfrontDistributionIndex: number
) =>
  new Route53Record({
    Name: domainName,
    Type: 'A',
    AliasTarget: {
      DNSName: GetAtt(
        cfLogicalNames.cloudfrontDistribution(
          (resource.configParentResourceType === 'nextjs-web'
            ? configManager.findImmediateParent({ nameChain: resource.nameChain })
            : resource
          ).name,
          cloudfrontDistributionIndex
        ),
        'DomainName'
      ),
      EvaluateTargetHealth: false,
      HostedZoneId: 'Z2FDTNDATAQYW2'
    },
    HostedZoneId: domainManager.getDomainStatus(domainName).hostedZoneInfo.HostedZone.Id
  });

// const getSimplifiedDomainName = (fullDomainName: string) => {
//   const splittedDomainName = fullDomainName.split('.');
//   if (splittedDomainName.length === 2) {
//     return fullDomainName;
//   }
//   return ['*', ...splittedDomainName.slice(-2)].join('.');
// };

export const getCdnDefaultDomainCustomResource = ({
  resource,
  domainName
}: {
  resource: StpCdnCompatibleResource;
  domainName: string;
}) => {
  return getStpServiceCustomResource<'defaultDomain'>({
    defaultDomain: {
      domainName:
        domainName ||
        domainManager.getDefaultDomainForResource({
          stpResourceName: resource.name,
          cdn: true
        }),
      targetInfo: {
        domainName: GetAtt(
          cfLogicalNames.cloudfrontDistribution(
            (resource.configParentResourceType === 'nextjs-web'
              ? configManager.findImmediateParent({ nameChain: resource.nameChain })
              : resource
            ).name,
            0
          ),
          'DomainName'
        ),
        hostedZoneId: 'Z2FDTNDATAQYW2'
      },
      version: domainManager.defaultDomainsInfo.version
    }
  });
};
