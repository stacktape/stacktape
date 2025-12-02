import { Bucket, defineConfig, LocalScriptWithCommand } from 'stacktape';

// scripts:
//   build:
//     type: local-script
//     properties:
//       executeCommand: bun run build

// hooks:
//   beforeDeploy:
//     - scriptName: build

// directives:
//   - name: getDomain
//     filePath: directives.ts:getDomain

// resources:
//   webBucket:
//     type: bucket
//     properties:
//       directoryUpload:
//         directoryPath: out
//         headersPreset: static-website
//       cdn:
//         enabled: true
//         errorDocument: /404.html
//         customDomains:
//           - domainName: $getDomain($Stage())
//         routeRewrites:
//           - path: /js/script.*
//             forwardingOptions:
//               allowedMethods:
//                 - GET
//                 - HEAD
//             routeTo:
//               type: custom-origin
//               properties:
//                 domainName: plausible.io
//           - path: /api/event
//             forwardingOptions:
//               originRequestPolicyId: acba4595-bd28-49b8-b9fe-13317c0390fa
//               allowedMethods:
//                 - GET
//                 - HEAD
//                 - OPTIONS
//                 - PUT
//                 - PATCH
//                 - POST
//                 - DELETE
//             routeTo:
//               type: custom-origin
//               properties:
//                 domainName: plausible.io

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

  const buildScript = new LocalScriptWithCommand({
    executeCommand: 'bun run build'
  });

  return {
    resources: { webBucket },
    scripts: { build: buildScript }
  };
});
