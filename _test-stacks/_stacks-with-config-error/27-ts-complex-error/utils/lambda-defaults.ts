// Lambda function default configurations

export type LambdaDefaults = {
  runtime: string;
  memory: number;
  timeout: number;
  environment: Record<string, string>;
};

export const getLambdaDefaults = (stage: string): LambdaDefaults => {
  const isProduction = stage === 'production';

  return {
    runtime: 'nodejs20.x',
    memory: isProduction ? 1024 : 512,
    timeout: isProduction ? 30 : 10,
    environment: {
      NODE_ENV: isProduction ? 'production' : 'development',
      STAGE: stage
    }
  };
};

export const createLambdaConfig = (
  name: string,
  entryPath: string,
  defaults: LambdaDefaults,
  overrides?: Partial<LambdaDefaults>
) => {
  return {
    type: 'function' as const,
    properties: {
      packaging: {
        type: 'stacktape-lambda-buildpack' as const,
        properties: {
          entryfilePath: entryPath
        }
      },
      memory: overrides?.memory ?? defaults.memory,
      timeout: overrides?.timeout ?? defaults.timeout,
      environment: [
        ...Object.entries(defaults.environment).map(([name, value]) => ({ name, value })),
        ...Object.entries(overrides?.environment ?? {}).map(([name, value]) => ({ name, value }))
      ]
    }
  };
};
