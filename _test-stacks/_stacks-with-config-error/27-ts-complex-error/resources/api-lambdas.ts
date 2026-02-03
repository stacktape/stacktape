// API Lambda function definitions
import { createLambdaConfig, getLambdaDefaults, getDatabaseConfig } from '../utils';

export const createApiLambdas = (stage: string) => {
  const defaults = getLambdaDefaults(stage);
  const dbConfig = getDatabaseConfig(stage); // This will trigger the error in database.ts

  return {
    getUsers: createLambdaConfig('get-users', 'src/handlers/get-users.ts', defaults, {
      environment: {
        DB_HOST: dbConfig.host,
        DB_PORT: String(dbConfig.port),
        DB_NAME: dbConfig.name
      }
    }),
    createUser: createLambdaConfig('create-user', 'src/handlers/create-user.ts', defaults, {
      memory: 1024,
      environment: {
        DB_HOST: dbConfig.host,
        DB_PORT: String(dbConfig.port),
        DB_NAME: dbConfig.name
      }
    }),
    deleteUser: createLambdaConfig('delete-user', 'src/handlers/delete-user.ts', defaults, {
      timeout: 15,
      environment: {
        DB_HOST: dbConfig.host,
        DB_PORT: String(dbConfig.port),
        DB_NAME: dbConfig.name
      }
    })
  };
};
