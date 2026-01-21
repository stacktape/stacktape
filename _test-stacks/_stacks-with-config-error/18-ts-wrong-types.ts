// Test case: TypeScript config with wrong value types
// Expected error: Type mismatches

export const getConfig = () => ({
  resources: {
    myFunction: {
      type: 'function',
      properties: {
        packaging: {
          type: 'stacktape-lambda-buildpack',
          properties: {
            entryfilePath: './handler.ts'
          }
        },
        runtime: 'nodejs20.x',
        timeout: 'thirty', // should be number
        memory: true, // should be number
        environment: 'DATABASE_URL=test' // should be array of objects
      }
    },
    myBucket: {
      type: 'bucket',
      properties: {
        versioning: {
          enabled: 'yes' // should be boolean
        },
        cors: {
          enabled: 1 // should be boolean
        }
      }
    }
  }
});
