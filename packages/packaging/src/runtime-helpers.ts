export const serializeEnvironment = (environment: NodeJS.ProcessEnv): Record<string, string> =>
  Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => entry[1] !== undefined));
