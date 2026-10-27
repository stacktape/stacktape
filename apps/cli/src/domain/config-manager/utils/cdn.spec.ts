import { describe, expect, test } from 'bun:test';
import type { BucketCdnConfiguration } from '@stacktape/config/buckets';
import type { CdnRouteRewrite } from '@stacktape/config/cdn';
import type { StpCdnCompatibleResource } from '../resolved-types/resources';
import { bucketNeedsOriginRequestLambda, cdnNeedsOriginRequestLambda } from './cdn';

const originRequest = 'arn:aws:lambda:us-east-1:123456789999:function:custom:1';
const resource = (type: StpCdnCompatibleResource['type'], cdn: BucketCdnConfiguration): StpCdnCompatibleResource =>
  ({ type, cdn }) as StpCdnCompatibleResource;

describe('built-in CDN origin-request handler requirements', () => {
  test.each([
    [{}, true],
    [{ disableUrlNormalization: true }, false],
    [{ disableUrlNormalization: true, rewriteRoutesForSinglePageApp: true }, true],
    [{ rewriteRoutesForSinglePageApp: true }, true],
    [{ edgeFunctions: { onOriginRequest: originRequest } }, false],
    [{ edgeFunctions: { onRequest: originRequest } }, true],
    [{ edgeFunctions: { onOriginResponse: originRequest } }, true]
  ] satisfies [Parameters<typeof bucketNeedsOriginRequestLambda>[0], boolean][])(
    'bucket options %j need handler: %j',
    (options, needed) => expect(bucketNeedsOriginRequestLambda(options)).toBe(needed)
  );

  test.each(['bucket', 'function', 'http-api-gateway', 'application-load-balancer'] as const)(
    '%s without an enabled CDN needs no handler',
    (type) => expect(cdnNeedsOriginRequestLambda(resource(type, { enabled: false }))).toBe(false)
  );

  test.each(['function', 'http-api-gateway', 'application-load-balancer'] as const)(
    '%s default and same-origin rewrites need no handler',
    (type) =>
      expect(
        cdnNeedsOriginRequestLambda(
          resource(type, {
            enabled: true,
            routeRewrites: [{ path: '/api/*', routePrefix: '/v2' }]
          })
        )
      ).toBe(false)
  );

  test.each([
    [{ path: '/static/*', routeTo: { type: 'bucket', properties: { bucketName: 'site' } } }, true],
    [
      {
        path: '/static/*',
        routeTo: { type: 'bucket', properties: { bucketName: 'site', disableUrlNormalization: true } }
      },
      false
    ],
    [
      {
        path: '/static/*',
        routeTo: { type: 'bucket', properties: { bucketName: 'site' } },
        edgeFunctions: { onOriginRequest: originRequest }
      },
      false
    ],
    [{ path: '/api/*', routeTo: { type: 'http-api-gateway', properties: { httpApiGatewayName: 'api' } } }, false],
    [{ path: '/fn/*', routeTo: { type: 'function', properties: { functionName: 'app' } } }, false],
    [
      {
        path: '/lb/*',
        routeTo: { type: 'application-load-balancer', properties: { loadBalancerName: 'web', listenerPort: 80 } }
      },
      false
    ],
    [{ path: '/external/*', routeTo: { type: 'custom-origin', properties: { domainName: 'example.com' } } }, false]
  ] satisfies [CdnRouteRewrite, boolean][])('explicit rewrite %j needs handler: %j', (route, needed) =>
    expect(
      cdnNeedsOriginRequestLambda(
        resource('function', {
          enabled: true,
          routeRewrites: [route]
        })
      )
    ).toBe(needed)
  );

  test('same-bucket rewrites normalize even when the default behaviour disables normalization', () => {
    expect(
      cdnNeedsOriginRequestLambda(
        resource('bucket', {
          enabled: true,
          disableUrlNormalization: true,
          routeRewrites: [{ path: '/docs/*' }]
        })
      )
    ).toBe(true);
  });

  test('a custom request handler overrides normalization independently for each behaviour', () => {
    expect(
      cdnNeedsOriginRequestLambda(
        resource('bucket', {
          enabled: true,
          edgeFunctions: { onOriginRequest: originRequest },
          routeRewrites: [{ path: '/docs/*' }]
        })
      )
    ).toBe(true);
    expect(
      cdnNeedsOriginRequestLambda(
        resource('bucket', {
          enabled: true,
          edgeFunctions: { onOriginRequest: originRequest },
          routeRewrites: [{ path: '/docs/*', edgeFunctions: { onOriginRequest: originRequest } }]
        })
      )
    ).toBe(false);
  });
});
