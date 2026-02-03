import { defineConfig } from 'stacktape';

// Syntax error - missing closing brace
export default defineConfig(({ stage }) => ({
  resources: {
    myLambda: {
      type: 'function',
      properties: {
        packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/lambda.ts' } }
      }
    // Missing closing brace here
  }
}));
