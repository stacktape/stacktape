// Publishes docs.stacktape.com: the static Astro build in a bucket behind a CDN.
//
// `pnpm deploy:docs` (production) and `pnpm deploy:docs:preview` (preview-docs.stacktape.com) from the repository root
// build the site from this checkout, upload `dist`, invalidate the CDN, and answer old URLs with 301s. Other stages get
// `<stage>-docs.stacktape.com`. The release procedure is in docs/releasing.md.
//
// The 301s: a CloudFront Function looks each request up in a CloudFront KeyValueStore that holds the redirect table
// (src/build/cdn-redirects.ts). The `redirectStore` custom resource writes the table into the store whenever it
// changes, so a deploy that changes nothing else keeps CloudFormation out of the way.
//
// The stack was created by Stacktape 3 from an equivalent bucket config. Keep the resource name `webBucket` and its
// `bucket` type: they decide the CloudFormation logical IDs of the bucket, the distribution and the DNS record, and a
// change would replace them.
import { isAbsolute } from 'node:path';
import {
  $CfResourceParam,
  Bucket,
  CustomResourceDefinition,
  CustomResourceInstance,
  defineConfig,
  JsBundleLambdaPackaging,
  LocalScript
} from '@stacktape/config-authoring';
import { buildRedirectStoreEntries, REDIRECT_FUNCTION_CODE } from './src/build/cdn-redirects.ts';
import type { RedirectStoreProperties } from './src/build/redirect-store-sync.ts';
import { CDN_REDIRECTS } from './src/utils/site-redirects.ts';

const REDIRECT_FUNCTION = 'DocsRedirectsFunction';
const REDIRECT_STORE = 'DocsRedirectsStore';

// Rollback: `DOCS_RESTORE_DIRECTORY=<absolute path to a backup of an earlier site> pnpm deploy:docs` uploads that
// directory instead of building this checkout, without the redirect function, its store and the store's writer (the
// redirects point at pages the earlier site lacks). The next normal deploy creates them again.
const restoreDirectory = process.env.DOCS_RESTORE_DIRECTORY;
if (restoreDirectory && !isAbsolute(restoreDirectory)) {
  throw new Error(`DOCS_RESTORE_DIRECTORY must be an absolute path; got ${restoreDirectory}.`);
}

export default defineConfig({ projectName: 'docs', region: 'eu-west-1' }, ({ stage }) => {
  const webBucket = new Bucket({
    directoryUpload: restoreDirectory
      ? { directoryPath: restoreDirectory, headersPreset: 'static-website' }
      : {
          directoryPath: 'dist',
          headersPreset: 'astro-static-website',
          // The preset sets caching only for HTML and `_astro/`. The LLM text, sitemaps and Twoslash declarations change
          // with every publish, so browsers revalidate them like HTML.
          fileOptions: [
            {
              includePattern: '**/*',
              excludePattern: '_astro/**/*',
              headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
            }
          ]
        },
    cdn: {
      enabled: true,
      errorDocument: '/404.html',
      customDomains: [{ domainName: stage === 'production' ? 'docs.stacktape.com' : `${stage}-docs.stacktape.com` }]
    },
    // `cdn.edgeFunctions` accepts only Lambda@Edge functions, so the CloudFront Function is attached here.
    overrides: restoreDirectory
      ? undefined
      : {
          WebBucketCdnDistribution0: {
            'DistributionConfig.DefaultCacheBehavior.FunctionAssociations': [
              { EventType: 'viewer-request', FunctionARN: $CfResourceParam(REDIRECT_FUNCTION, 'FunctionARN') }
            ]
          }
        }
  });

  // Typed as a record so that TypeScript does not merge it with the full config's resources below.
  if (restoreDirectory) return { resources: { webBucket } as Record<string, typeof webBucket> };

  const storeArn = $CfResourceParam(REDIRECT_STORE, 'Arn');
  // Writes the redirect table into the store (src/build/redirect-store-sync.ts). The SDK is bundled so that the KeyValueStore
  // client and its SigV4A signer share one copy of the signing code.
  const redirectStoreWriter = new CustomResourceDefinition({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: 'src/build/redirect-store-sync.ts', bundleAwsSdk: true }),
    timeout: 120,
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: [
          'cloudfront-keyvaluestore:DescribeKeyValueStore',
          'cloudfront-keyvaluestore:ListKeys',
          'cloudfront-keyvaluestore:UpdateKeys'
        ],
        Resource: [storeArn]
      }
    ]
  });
  const redirectStoreProperties: RedirectStoreProperties = {
    storeArn,
    redirects: Object.entries(buildRedirectStoreEntries(CDN_REDIRECTS))
  };
  const redirectStore = new CustomResourceInstance({
    definitionName: 'redirectStoreWriter',
    resourceProperties: redirectStoreProperties
  });

  return {
    resources: { webBucket, redirectStoreWriter, redirectStore },
    scripts: {
      build: new LocalScript({ executeCommand: 'pnpm exec turbo run build --filter @stacktape/docs', cwd: '../..' })
    },
    hooks: { beforeDeploy: [{ scriptName: 'build' }] },
    cloudformationResources: {
      [REDIRECT_STORE]: {
        Type: 'AWS::CloudFront::KeyValueStore',
        Properties: { Name: `docs-${stage}-redirects`, Comment: 'Old docs URLs and the URLs they moved to' }
      },
      [REDIRECT_FUNCTION]: {
        Type: 'AWS::CloudFront::Function',
        Properties: {
          Name: `docs-${stage}-redirects`,
          AutoPublish: true,
          FunctionConfig: {
            Comment: 'Answers old docs URLs with a 301',
            Runtime: 'cloudfront-js-2.0',
            KeyValueStoreAssociations: [{ KeyValueStoreARN: storeArn }]
          },
          FunctionCode: REDIRECT_FUNCTION_CODE
        }
      }
    }
  };
});
