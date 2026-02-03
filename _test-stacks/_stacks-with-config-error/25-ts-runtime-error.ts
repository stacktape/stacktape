import { defineConfig } from 'stacktape';

export default defineConfig(({ stage }) => {
  // Reference an undefined variable
  const config = someUndefinedVariable;

  return {
    resources: {
      myLambda: {
        type: 'function',
        properties: {
          packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/lambda.ts' } }
        }
      }
    }
  };
});
