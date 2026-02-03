// Complex Stacktape configuration that imports from multiple files
// The actual error is in utils/database.ts but triggered through the call chain

import { defineConfig } from 'stacktape';
import { createApiLambdas, createBackgroundJobs } from './resources';

export default defineConfig(({ stage }) => {
  // This call chain will eventually trigger an error deep in utils/database.ts:
  // stacktape.ts -> resources/api-lambdas.ts -> utils/database.ts (error here!)
  const apiLambdas = createApiLambdas(stage);
  const backgroundJobs = createBackgroundJobs(stage);

  return {
    resources: {
      // API endpoints
      ...apiLambdas,

      // Background processing
      ...backgroundJobs,

      // HTTP API Gateway
      mainApi: {
        type: 'http-api-gateway',
        properties: {
          routes: [
            { path: '/users', method: 'GET', integration: { type: 'function', functionName: 'getUsers' } },
            { path: '/users', method: 'POST', integration: { type: 'function', functionName: 'createUser' } },
            { path: '/users/{id}', method: 'DELETE', integration: { type: 'function', functionName: 'deleteUser' } }
          ]
        }
      }
    }
  };
});
