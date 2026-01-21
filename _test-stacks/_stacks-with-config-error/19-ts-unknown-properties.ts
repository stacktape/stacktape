// Test case: TypeScript config with unknown/misspelled properties
// Expected error: Unknown properties with suggestions

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
        timout: 30, // typo - should be "timeout"
        memmory: 512, // typo - should be "memory"
        enviroment: [], // typo - should be "environment"
        connnectTo: [] // typo - should be "connectTo"
      }
    },
    myDatabase: {
      type: 'relational-database',
      properties: {
        credentails: {
          // typo - should be "credentials"
          masterUserPassword: 'secret'
        },
        engien: {
          // typo - should be "engine"
          type: 'postgres'
        }
      }
    }
  }
});
