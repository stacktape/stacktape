import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { CdnCacheKey, CdnForwardingOptions } from '@stacktape/config/cdn';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import configSchema from '@stacktape/config/config-schema.json';
import { HttpApiGateway, defineConfig } from '@stacktape/config-authoring';
import { validateConfigStructure } from '../../src/domain/config-manager/utils/validation';
import { validateConfigWithZod } from '../../src/domain/config-manager/utils/zod-validator';
import { synthesizeFixture } from './synthesis-fixture';

/**
 * CDN cookie, header and query-string selectors are exclusive choices. Each sets exactly one option; boolean options
 * must be `true`. Stacktape 3 accepted `{ all: false }` and applied `all` anyway, so v4 rejects false values, empty
 * selectors and several options with an error that lists the valid choices. Valid one-option selectors synthesize the
 * same cache and origin-request policies as before.
 */

type Kind = 'cacheKeyParameters' | 'forwardingOptions';
type Property = 'cookies' | 'headers' | 'queryString';

// Every valid option of the six selectors, with the CloudFormation behaviour and list it must produce.
const validChoices: { kind: Kind; property: Property; selector: Record<string, unknown> }[] = [
  { kind: 'cacheKeyParameters', property: 'cookies', selector: { none: true } },
  { kind: 'cacheKeyParameters', property: 'cookies', selector: { all: true } },
  { kind: 'cacheKeyParameters', property: 'cookies', selector: { whitelist: ['session'] } },
  { kind: 'cacheKeyParameters', property: 'cookies', selector: { allExcept: ['tracking'] } },
  { kind: 'cacheKeyParameters', property: 'headers', selector: { none: true } },
  { kind: 'cacheKeyParameters', property: 'headers', selector: { whitelist: ['accept-language'] } },
  { kind: 'cacheKeyParameters', property: 'queryString', selector: { none: true } },
  { kind: 'cacheKeyParameters', property: 'queryString', selector: { all: true } },
  { kind: 'cacheKeyParameters', property: 'queryString', selector: { whitelist: ['lang'] } },
  { kind: 'forwardingOptions', property: 'cookies', selector: { none: true } },
  { kind: 'forwardingOptions', property: 'cookies', selector: { all: true } },
  { kind: 'forwardingOptions', property: 'cookies', selector: { whitelist: ['session'] } },
  { kind: 'forwardingOptions', property: 'headers', selector: { none: true } },
  { kind: 'forwardingOptions', property: 'headers', selector: { allViewer: true } },
  { kind: 'forwardingOptions', property: 'headers', selector: { whitelist: ['authorization'] } },
  {
    kind: 'forwardingOptions',
    property: 'headers',
    selector: { allViewerAndWhitelistCloudFront: ['CloudFront-Viewer-Country'] }
  },
  { kind: 'forwardingOptions', property: 'headers', selector: { allExcept: ['host'] } },
  { kind: 'forwardingOptions', property: 'queryString', selector: { none: true } },
  { kind: 'forwardingOptions', property: 'queryString', selector: { all: true } },
  { kind: 'forwardingOptions', property: 'queryString', selector: { whitelist: ['page'] } }
];

const invalidSelectors: { selector: Record<string, unknown>; problem: string }[] = [
  { selector: { all: false }, problem: 'all' },
  { selector: { none: false }, problem: '`none: false`' },
  { selector: {}, problem: 'sets no option' },
  { selector: { none: true, all: true }, problem: 'sets 2 options' },
  { selector: { all: true, whitelist: ['session'] }, problem: 'sets 2 options' },
  { selector: { allViewer: true }, problem: 'unknown option `allViewer`' }
];

const cdnWith = (kind: Kind, property: Property, selector: Record<string, unknown>) =>
  kind === 'cacheKeyParameters'
    ? { enabled: true, cachingOptions: { cacheKeyParameters: { [property]: selector } } }
    : { enabled: true, forwardingOptions: { [property]: selector } };

const rawConfig = (cdn: unknown) => ({
  resources: { api: { type: 'http-api-gateway', properties: { cdn } } }
});

const policyFieldNames = {
  cacheKeyParameters: {
    cookies: ['CookiesConfig', 'CookieBehavior', 'Cookies'],
    headers: ['HeadersConfig', 'HeaderBehavior', 'Headers'],
    queryString: ['QueryStringsConfig', 'QueryStringBehavior', 'QueryStrings']
  },
  forwardingOptions: {
    cookies: ['CookiesConfig', 'CookieBehavior', 'Cookies'],
    headers: ['HeadersConfig', 'HeaderBehavior', 'Headers'],
    queryString: ['QueryStringsConfig', 'QueryStringBehavior', 'QueryStrings']
  }
} as const;

const synthesizeRewrites = (choices: typeof validChoices) =>
  synthesizeFixture({
    compiledConfig: defineConfig(() => {
      const api = new HttpApiGateway({
        cdn: {
          enabled: true,
          routeRewrites: choices.map(({ kind, property, selector }, index) => ({
            path: `/choice-${index}/*`,
            ...(kind === 'cacheKeyParameters'
              ? {
                  // A TTL that differs from the default gives every rewrite its own cache policy.
                  cachingOptions: { defaultTTL: 60, cacheKeyParameters: { [property]: selector } as CdnCacheKey }
                }
              : { forwardingOptions: { [property]: selector } as CdnForwardingOptions })
          }))
        }
      });
      return { resources: { api } };
    })({
      projectName: 'characterization',
      stage: 'baseline',
      region: 'eu-west-1',
      cliArgs: {} as any,
      command: 'synth',
      awsProfile: '',
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    }),
    workingDir: join(import.meta.dir, 'fixtures', 'dense-application')
  });

const policyForPath = (template: CloudFormationTemplate, path: string, kind: Kind) => {
  const distribution = Object.values(template.Resources).find(
    (resource) => (resource as { Type: string }).Type === 'AWS::CloudFront::Distribution'
  ) as { Properties: { DistributionConfig: { CacheBehaviors: Record<string, any>[] } } };
  const behavior = distribution.Properties.DistributionConfig.CacheBehaviors.find(
    (cacheBehavior) => cacheBehavior.PathPattern === path
  );
  const policyId = kind === 'cacheKeyParameters' ? behavior.CachePolicyId : behavior.OriginRequestPolicyId;
  const policy = template.Resources[policyId.Ref] as { Properties: Record<string, any> };
  return kind === 'cacheKeyParameters'
    ? policy.Properties.CachePolicyConfig.ParametersInCacheKeyAndForwardedToOrigin
    : policy.Properties.OriginRequestPolicyConfig;
};

describe('CDN selectors are exclusive choices', () => {
  test('the published types accept one option and reject false values and several options', () => {
    const accepted: CdnCacheKey = { cookies: { all: true }, headers: { whitelist: ['accept'] } };
    const forwarded: CdnForwardingOptions = { headers: { allViewer: true }, queryString: { none: true } };
    // @ts-expect-error A boolean option must be `true`.
    const falseValue: CdnCacheKey = { cookies: { all: false } };
    // @ts-expect-error Only one option can be set.
    const twoOptions: CdnForwardingOptions = { cookies: { none: true, all: true } };
    // @ts-expect-error An empty selector chooses nothing.
    const empty: CdnCacheKey = { queryString: {} };
    expect([accepted, forwarded, falseValue, twoOptions, empty]).toHaveLength(5);
  });

  test('the JSON schema allows exactly one option per selector, with boolean options fixed to true', () => {
    const definitions = configSchema.definitions as Record<string, any>;
    for (const name of [
      'CacheKeyCookies',
      'CacheKeyHeaders',
      'CacheKeyQueryString',
      'ForwardCookies',
      'ForwardHeaders',
      'ForwardQueryString'
    ]) {
      for (const { $ref } of definitions[name].anyOf) {
        const arm = definitions[$ref.replace('#/definitions/', '')];
        const keys = Object.keys(arm.properties);
        expect(keys).toHaveLength(1);
        expect(arm.required).toEqual(keys);
        expect(arm.additionalProperties).toBe(false);
        const option = arm.properties[keys[0]];
        expect(option.type === 'array' || option.const === true).toBe(true);
      }
    }
  });

  test.each(validChoices)('the validator accepts $kind.$property $selector', ({ kind, property, selector }) => {
    expect(validateConfigWithZod({ config: rawConfig(cdnWith(kind, property, selector)), configPath: 'a.ts' })).toEqual(
      { valid: true }
    );
  });

  for (const kind of ['cacheKeyParameters', 'forwardingOptions'] as const) {
    for (const property of ['cookies', 'headers', 'queryString'] as const) {
      // `allViewer` is a valid option for forwarded headers only.
      const cases = invalidSelectors.filter(
        ({ selector }) => !(selector.allViewer && kind === 'forwardingOptions' && property === 'headers')
      );
      test.each(cases)(`${kind}.${property} rejects $selector`, async ({ selector, problem }) => {
        expect(
          validateConfigWithZod({ config: rawConfig(cdnWith(kind, property, selector)), configPath: 'a.ts' }).valid
        ).toBe(false);
        const error = await synthesizeFixture({
          compiledConfig: { config: rawConfig(cdnWith(kind, property, selector)) } as unknown as Parameters<
            typeof synthesizeFixture
          >[0]['compiledConfig'],
          workingDir: join(import.meta.dir, 'fixtures', 'dense-application')
        }).catch((caught: Error) => caught);
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        const path =
          kind === 'cacheKeyParameters'
            ? `properties.cdn.cachingOptions.cacheKeyParameters.${property}`
            : `properties.cdn.forwardingOptions.${property}`;
        expect(message).toContain(`Resource \`api\`: \`${path}\``);
        // Headers have no `all` option, so `all: false` is reported as an unknown option there.
        expect(message).toContain(
          problem === 'all' ? (property === 'headers' ? 'unknown option `all`' : '`all: false`') : problem
        );
        expect(message).toContain('Set exactly one of:');
      });
    }
  }

  test('the same key names outside a CDN are not selectors', async () => {
    await validateConfigStructure({
      configPath: 'stacktape.yml',
      config: {
        resources: {
          workflow: {
            type: 'state-machine',
            properties: {
              definition: {
                StartAt: 'Respond',
                States: {
                  Respond: {
                    Type: 'Pass',
                    Result: { forwardingOptions: { headers: { 'x-custom': 'value' } } },
                    End: true
                  }
                }
              }
            }
          }
        }
      } as never
    });
  });

  test('every valid option synthesizes the matching CloudFront policy', async () => {
    const template = await synthesizeRewrites(validChoices);
    validChoices.forEach(({ kind, property, selector }, index) => {
      const [configName, behaviourName, listName] = policyFieldNames[kind][property];
      const [behaviour, value] = Object.entries(selector)[0];
      expect(policyForPath(template, `/choice-${index}/*`, kind)[configName]).toEqual(
        Array.isArray(value) ? { [behaviourName]: behaviour, [listName]: value } : { [behaviourName]: behaviour }
      );
    });
  });
});
