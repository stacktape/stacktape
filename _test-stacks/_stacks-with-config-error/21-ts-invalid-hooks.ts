// Test case: TypeScript config with invalid hooks configuration
// Expected error: Invalid hook configuration

export const getConfig = () => ({
  hooks: {
    beforeDeploy: [
      {
        scriptNam: 'build' // typo - should be "scriptName"
      },
      {
        scriptName: 123 // should be string
      }
    ],
    afterDeplo: [
      // typo - should be "afterDeploy"
      {
        scriptName: 'migrate'
      }
    ],
    beforeDelete: 'cleanup' // should be array of objects
  },
  scripts: {
    build: {
      type: 'local-script',
      properties: {
        executeCommand: 'npm run build'
      }
    }
  },
  resources: {}
});
