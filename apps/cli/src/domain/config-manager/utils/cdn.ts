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

type CdnSelectorKind = 'cacheKeyParameters' | 'forwardingOptions';
type CdnSelectorProperty = 'cookies' | 'headers' | 'queryString';

/**
 * The options each CDN selector accepts. A boolean option is written as `true`; a list option names cookies, headers or
 * query parameters. Exactly one option is set.
 */
export const CDN_SELECTOR_CHOICES: Record<
  CdnSelectorKind,
  Record<CdnSelectorProperty, { booleanChoices: string[]; listChoices: string[] }>
> = {
  cacheKeyParameters: {
    cookies: { booleanChoices: ['none', 'all'], listChoices: ['whitelist', 'allExcept'] },
    headers: { booleanChoices: ['none'], listChoices: ['whitelist'] },
    queryString: { booleanChoices: ['none', 'all'], listChoices: ['whitelist'] }
  },
  forwardingOptions: {
    cookies: { booleanChoices: ['none', 'all'], listChoices: ['whitelist'] },
    headers: {
      booleanChoices: ['none', 'allViewer'],
      listChoices: ['whitelist', 'allViewerAndWhitelistCloudFront', 'allExcept']
    },
    queryString: { booleanChoices: ['none', 'all'], listChoices: ['whitelist'] }
  }
};

/** Returns the chosen option, or an error message when the selector does not set exactly one valid option. */
export const readCdnSelector = (
  selector: unknown,
  kind: CdnSelectorKind,
  property: CdnSelectorProperty
): { behaviour: string; names: string[] | undefined } | { error: string } => {
  const { booleanChoices, listChoices } = CDN_SELECTOR_CHOICES[kind][property];
  const record = (selector && typeof selector === 'object' ? selector : {}) as Record<string, unknown>;
  const keys = Object.keys(record);
  const [behaviour] = keys;
  const value = record[behaviour];
  if (
    keys.length === 1 &&
    ((booleanChoices.includes(behaviour) && value === true) ||
      (listChoices.includes(behaviour) && Array.isArray(value)))
  ) {
    return { behaviour, names: listChoices.includes(behaviour) ? (value as string[]) : undefined };
  }
  const choices = [
    ...booleanChoices.map((choice) => `\`${choice}: true\``),
    ...listChoices.map((choice) => `\`${choice}: [...]\``)
  ].join(', ');
  const problem =
    keys.length === 0
      ? 'sets no option'
      : keys.length > 1
        ? `sets ${keys.length} options (${keys.map((key) => `\`${key}\``).join(', ')})`
        : ![...booleanChoices, ...listChoices].includes(behaviour)
          ? `sets the unknown option \`${behaviour}\``
          : value === false
            ? `sets \`${behaviour}: false\`. \`false\` is not accepted, because Stacktape 3 applied \`${behaviour}\` anyway`
            : `sets \`${behaviour}\` to an unsupported value`;
  return { error: `${problem}. Set exactly one of: ${choices}.` };
};

const SELECTOR_PROPERTIES: CdnSelectorProperty[] = ['cookies', 'headers', 'queryString'];

/**
 * Finds CDN cookie, header and query-string selectors anywhere in a resource (the CDN itself and its route rewrites)
 * and reports the first one that does not set exactly one valid option. The generated schema rejects the same values,
 * but its union error does not say which options exist.
 */
export const findInvalidCdnSelector = (value: unknown, path: string[] = []): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const error = findInvalidCdnSelector(item, [...path, String(index)]);
      if (error) return error;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const kind = path.at(-1);
  if (kind === 'cacheKeyParameters' || kind === 'forwardingOptions') {
    for (const property of SELECTOR_PROPERTIES) {
      const selector = record[property];
      // Directives are resolved later and validated after resolution.
      if (selector === undefined || typeof selector === 'string') continue;
      const result = readCdnSelector(selector, kind, property);
      if ('error' in result) return `\`${[...path, property].join('.')}\` ${result.error}`;
    }
  }
  for (const [key, child] of Object.entries(record)) {
    const error = findInvalidCdnSelector(child, [...path, key]);
    if (error) return error;
  }
  return undefined;
};
