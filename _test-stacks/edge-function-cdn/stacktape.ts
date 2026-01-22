import { defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  return {
    resources: {
      hostingBucket: {
        type: 'hosting-bucket',
        properties: {
          hostingContentType: 'static-website',
          uploadDirectoryPath: './public',
          edgeFunctions: {
            onRequest: 'forwardHostFunction'
          }
        }
      },
      forwardHostFunction: {
        type: 'edge-lambda-function',
        properties: {
          packaging: {
            type: 'stacktape-lambda-buildpack',
            properties: {
              entryfilePath: 'edge-functions/forward-host.ts'
            }
          }
        }
      }
    }
  };
});
