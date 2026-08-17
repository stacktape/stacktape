/** `$Secret('project-mainDatabase.password')` or `$Secret('mainDatabase.password')`. */
const GENERATED_SECRET_PATTERN = /^\$Secret\('([^']+)\.password'\)$/;

/** Namespace predicate shared with the destructive canary cleanup guard. */
export const isGeneratedSecretNameForProject = (projectName: string, secretName: string): boolean =>
  secretName.startsWith(`${projectName}-`) && secretName.length > projectName.length + 1;

/** Composer-generated database secret names referenced by a resource tree. */
export const generatedSecretNames = (resources: Record<string, { properties: Record<string, unknown> }>): string[] => {
  const names = new Set<string>();
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      const match = GENERATED_SECRET_PATTERN.exec(value);
      // The CLI's directive contract is `secretName.jsonKey`; the generated name is everything
      // before the one key separator.
      if (match?.[1] !== undefined) names.add(match[1]);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry);
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const entry of Object.values(value)) walk(entry);
    }
  };
  for (const resource of Object.values(resources)) walk(resource.properties);
  return [...names];
};
