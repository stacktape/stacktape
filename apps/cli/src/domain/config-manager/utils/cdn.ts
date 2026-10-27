import type { EdgeFunctionsConfig } from '@stacktape/config/cdn';
import type { BucketCdnConfiguration } from '@stacktape/config/buckets';
import type { StpCdnCompatibleResource } from '../resolved-types/resources';

/** The built-in request handler only normalizes bucket URLs or supplies the SPA entry page. */
export const bucketNeedsOriginRequestLambda = ({
  disableUrlNormalization,
  rewriteRoutesForSinglePageApp,
  edgeFunctions
}: Pick<BucketCdnConfiguration, 'disableUrlNormalization' | 'rewriteRoutesForSinglePageApp'> & {
  edgeFunctions?: EdgeFunctionsConfig;
}): boolean => (!disableUrlNormalization || Boolean(rewriteRoutesForSinglePageApp)) && !edgeFunctions?.onOriginRequest;

export const cdnNeedsOriginRequestLambda = (resource: StpCdnCompatibleResource): boolean => {
  if (!resource.cdn?.enabled) return false;
  if (resource.type === 'bucket' && bucketNeedsOriginRequestLambda(resource.cdn)) return true;
  return Boolean(
    resource.cdn.routeRewrites?.some((route) => {
      if (route.routeTo?.type === 'bucket') {
        return bucketNeedsOriginRequestLambda({
          disableUrlNormalization: route.routeTo.properties.disableUrlNormalization,
          edgeFunctions: route.edgeFunctions
        });
      }
      // A rewrite without routeTo uses the distribution's origin, with the rewrite's own options. Bucket rewrites
      // normalize URLs by default, even when the default behaviour disables normalization or enables SPA routing.
      return (
        !route.routeTo &&
        resource.type === 'bucket' &&
        bucketNeedsOriginRequestLambda({
          edgeFunctions: route.edgeFunctions
        })
      );
    })
  );
};
