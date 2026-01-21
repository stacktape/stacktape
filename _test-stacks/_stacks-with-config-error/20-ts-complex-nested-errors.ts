// Test case: TypeScript config with complex nested errors
// Expected error: Multiple nested validation errors

export const getConfig = () => ({
  resources: {
    myWebService: {
      type: 'web-service',
      properties: {
        packaging: {
          type: 'custom-dockerfile',
          properties: {
            dockerfilPath: './Dockerfile', // typo - should be "dockerfilePath"
            buildContextPath: 123 // should be string
          }
        },
        resources: {
          cpu: 'half', // should be number
          memory: -512 // should be positive
        },
        scaling: {
          minInstances: 'two', // should be number
          maxInstances: 1
        },
        loadBalancing: {
          type: 'application-load-balancr', // typo
          properties: {}
        }
      }
    },
    myNextjs: {
      type: 'nextjs-web',
      properties: {
        appDirectory: 123, // should be string
        customDomains: [
          {
            domainNam: 'example.com' // typo - should be "domainName"
          }
        ]
      }
    }
  },
  scripts: {
    migrate: {
      type: 'local-script',
      properties: {
        executeComand: 'npm run migrate', // typo - should be "executeCommand"
        cwd: 12345 // should be string
      }
    }
  }
});
