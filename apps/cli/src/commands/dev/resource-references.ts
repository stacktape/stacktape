import { getDirectiveParams, getIsDirective, startsLikeGetParamDirective } from '@utils/directives';

/** Extract resource names referenced via $ResourceParam directives in environment variables */
export const getResourceParamReferences = (configResource: any): string[] => {
  if (!configResource) return [];
  const references: string[] = [];

  const scanValue = (value: any) => {
    if (typeof value === 'string' && getIsDirective(value) && startsLikeGetParamDirective(value)) {
      try {
        const params = getDirectiveParams('ResourceParam', value);
        if (params[0]?.value && typeof params[0].value === 'string') {
          references.push(params[0].value);
        }
      } catch {
        // Ignore parsing errors
      }
    }
  };

  const scanEnvVars = (environment: any) => {
    if (!environment) return;
    // Handle array format: [{ name: 'VAR', value: '$ResourceParam(...)' }]
    if (Array.isArray(environment)) {
      for (const envVar of environment) {
        scanValue(envVar.value);
      }
    }
    // Handle object format: { VAR: '$ResourceParam(...)' }
    else if (typeof environment === 'object') {
      for (const value of Object.values(environment)) {
        scanValue(value);
      }
    }
  };

  // Scan environment at resource level (for functions and single-container workloads)
  scanEnvVars(configResource.environment);

  // Scan environment in each container (for multi-container workloads)
  if (configResource.containers) {
    for (const container of configResource.containers) {
      scanEnvVars(container.environment);
    }
  }

  // Scan injectEnvironment (for hosting-bucket and nextjs-web)
  scanEnvVars(configResource.injectEnvironment);

  return references;
};
