import { defineConfig } from 'stacktape';
// This import will fail - non-existent package
import { something } from 'non-existent-package-xyz';

console.log(something); // Force the import to be used

export default defineConfig(({ stage }) => ({
  resources: {
    myLambda: {
      type: 'function',
      properties: {
        packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/lambda.ts' } }
      }
    }
  }
}));
