import { defineConfig } from 'stacktape';

export default defineConfig(({ stage }) => {
  if (stage === 'test') {
    throw new Error('This stage is not allowed for security reasons');
  }

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
