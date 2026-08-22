const STACKTAPE_YAML_FILE = /(?:stacktape|stp)(?:\.debug)?\.ya?ml$/i;
const STACKTAPE_CONFIG_FILE = /(?:stacktape|stp)(?:\.debug|\.config)?\.(?:ya?ml|ts)$/i;

export const isStacktapeYamlPath = (path: string): boolean => STACKTAPE_YAML_FILE.test(path);

export const isStacktapeConfigPath = (path?: string): path is string =>
  typeof path === 'string' && STACKTAPE_CONFIG_FILE.test(path);
