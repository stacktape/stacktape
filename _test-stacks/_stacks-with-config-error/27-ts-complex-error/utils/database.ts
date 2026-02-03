// Database configuration utilities

export type DatabaseConfig = {
  host: string;
  port: number;
  name: string;
  credentials: {
    username: string;
    password: string;
  };
};

export const getDatabaseConfig = (stage: string): DatabaseConfig => {
  // This will throw an error - accessing property of undefined
  const config = undefined as any;
  return {
    host: config.host, // Error happens here!
    port: config.port,
    name: `myapp-${stage}`,
    credentials: {
      username: config.credentials.username,
      password: config.credentials.password
    }
  };
};

export const validateDatabaseConfig = (config: DatabaseConfig): void => {
  if (!config.host) {
    throw new Error('Database host is required');
  }
  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Database port must be between 1 and 65535');
  }
};
