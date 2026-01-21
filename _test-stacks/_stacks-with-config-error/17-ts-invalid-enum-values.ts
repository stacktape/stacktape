// Test case: TypeScript config with invalid enum values
// Expected error: "Did you mean?" suggestions

export const getConfig = () => ({
  resources: {
    myFirewall: {
      type: 'web-app-firewall',
      properties: {
        scope: 'reginal', // typo - should be "regional"
        defaultAction: 'Alow', // typo - should be "Allow"
        rules: []
      }
    },
    myFunction: {
      type: 'function',
      properties: {
        packaging: {
          type: 'stacktape-lambda-buildpack',
          properties: {
            entryfilePath: './handler.ts'
          }
        },
        runtime: 'nodejs21.x', // invalid runtime
        architecture: 'arm' // should be "arm64" or "x86_64"
      }
    }
  }
});
