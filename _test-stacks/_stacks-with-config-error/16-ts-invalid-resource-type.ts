// Test case: TypeScript config with invalid resource type
// Expected error: Invalid type (no line numbers for TS)

export const getConfig = () => ({
  resources: {
    myApi: {
      type: 'web-servce', // typo - should be "web-service"
      properties: {
        packaging: {
          type: 'stacktape-image-buildpack',
          properties: {
            entryfilePath: './src/index.ts'
          }
        },
        resources: {
          cpu: 0.25,
          memory: 512
        }
      }
    }
  }
});
