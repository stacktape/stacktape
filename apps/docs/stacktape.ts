// Publishes docs.stacktape.com: the static Astro build in a bucket behind a CDN.
//
// `pnpm deploy:docs` (production) and `pnpm deploy:docs:preview` (preview-docs.stacktape.com) from the repository root
// build the site from this checkout, upload `dist`, invalidate the CDN, and answer old URLs with 301s. Other stages get
// `<stage>-docs.stacktape.com`. The release procedure is in docs/releasing.md.
//
// The stack was created by Stacktape 3 from an equivalent bucket config. Keep the resource name `webBucket` and its
// `bucket` type: they decide the CloudFormation logical IDs of the bucket, the distribution and the DNS record, and a
// change would replace them.
import { $CfResourceParam, Bucket, defineConfig, LocalScript } from '@stacktape/config-authoring';
import { buildRedirectFunctionCode } from './src/build/cdn-redirects.ts';
import { SITE_REDIRECTS } from './src/utils/site-redirects.ts';

const REDIRECT_FUNCTION = 'DocsRedirectsFunction';

// Rollback: `DOCS_RESTORE_DIRECTORY=<backup of an earlier site> pnpm deploy:docs` uploads that directory instead of
// building this checkout, without the redirects (they point at pages the earlier site does not have).
const restoreDirectory = process.env.DOCS_RESTORE_DIRECTORY;

export default defineConfig({ projectName: 'docs', region: 'eu-west-1' }, ({ stage }) => {
  const webBucket = new Bucket({
    directoryUpload: restoreDirectory
      ? { directoryPath: restoreDirectory, headersPreset: 'static-website' }
      : { directoryPath: 'dist', headersPreset: 'astro-static-website' },
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

  if (restoreDirectory) return { resources: { webBucket } };

  return {
    resources: { webBucket },
    scripts: {
      build: new LocalScript({ executeCommand: 'pnpm exec turbo run build --filter @stacktape/docs', cwd: '../..' })
    },
    hooks: { beforeDeploy: [{ scriptName: 'build' }] },
    cloudformationResources: {
      [REDIRECT_FUNCTION]: {
        Type: 'AWS::CloudFront::Function',
        Properties: {
          Name: `docs-${stage}-redirects`,
          AutoPublish: true,
          FunctionConfig: { Comment: 'Answers old docs URLs with a 301', Runtime: 'cloudfront-js-2.0' },
          // Search consoles and crawlers still ask for the Stacktape 3 sitemap URL.
          FunctionCode: buildRedirectFunctionCode({ ...SITE_REDIRECTS, '/sitemap.xml': '/sitemap-index.xml' })
        }
      }
    }
  };
});
