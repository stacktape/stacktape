import { Bucket, defineConfig, LocalScript } from '../__release-npm';

export default defineConfig(({ stage }) => {
  const webBucket = new Bucket({
    directoryUpload: {
      directoryPath: 'out',
      headersPreset: 'static-website'
    },
    cdn: {
      enabled: true,
      errorDocument: '/404.html',
      customDomains: [{ domainName: stage === 'production' ? 'docs.stacktape.com' : `${stage}-docs.stacktape.com` }],
      routeRewrites: [
        {
          path: '/js/script.*',
          forwardingOptions: {
            allowedMethods: ['GET', 'HEAD']
          },
          routeTo: {
            type: 'custom-origin',
            properties: {
              domainName: 'plausible.io'
            }
          }
        },
        {
          path: '/api/event',
          forwardingOptions: {
            originRequestPolicyId: 'acba4595-bd28-49b8-b9fe-13317c0390fa',
            allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']
          },
          routeTo: {
            type: 'custom-origin',
            properties: {
              domainName: 'plausible.io'
            }
          }
        }
      ]
    }
  });

  const buildScript = new LocalScript({
    executeCommand: 'bun run build'
  });

  return {
    resources: { webBucket },
    scripts: { build: buildScript }
  };
});
