import type { StacktapeConfig } from '@stacktape/config';

const PATH_PROPERTIES: Readonly<Record<string, { oftenGenerated?: boolean }>> = {
  filePath: {},
  executeScript: {},
  executeScripts: {},
  entryfilePath: {},
  directoryPath: { oftenGenerated: true },
  uploadDirectoryPath: { oftenGenerated: true },
  packagePath: {},
  buildContextPath: {},
  dockerfilePath: {},
  tsConfigPath: {},
  sourceDirectoryPath: {},
  appDirectory: {}
};

type ConfigPathOwner =
  | { pathType: 'resource'; name: string; resourceType?: string }
  | { pathType: 'directive'; name?: string }
  | { pathType: 'script'; name: string };

export type ExtractedPath = ConfigPathOwner & {
  path: string;
  pathPropertyLocation: string;
  oftenGenerated?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const getAtPath = (root: unknown, path: readonly string[]): unknown => {
  let current = root;
  for (const segment of path) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

const getOwner = (stacktapeConfig: StacktapeConfig, pathToNode: string): ConfigPathOwner | undefined => {
  const segments = pathToNode.split('.').filter(Boolean);
  const [collection, name] = segments;

  if (collection === 'resources' && name) {
    const resourceType = getAtPath(stacktapeConfig, ['resources', name, 'type']);
    return {
      pathType: 'resource',
      name,
      ...(typeof resourceType === 'string' && { resourceType })
    };
  }
  if (collection === 'directives') {
    const directiveName = getAtPath(stacktapeConfig, segments.slice(0, 2).concat('name'));
    return { pathType: 'directive', ...(typeof directiveName === 'string' && { name: directiveName }) };
  }
  if (collection === 'scripts' && name) {
    return { pathType: 'script', name };
  }
  return undefined;
};

const cleanPath = (path: string): string => {
  const pathParts = path.split(':');
  return pathParts.length > 1 ? pathParts.slice(0, -1).join(':') : path;
};

export const extractPaths = ({ stacktapeConfig }: { stacktapeConfig: StacktapeConfig }): ExtractedPath[] => {
  const result: ExtractedPath[] = [];

  const processNode = (node: unknown, pathToNode: string): void => {
    if (Array.isArray(node)) {
      node.forEach((nodeValue, index) => processNode(nodeValue, `${pathToNode}.${index}`));
      return;
    }
    if (!isRecord(node)) {
      return;
    }

    for (const [propertyName, nodeValue] of Object.entries(node)) {
      const matchingProperty = PATH_PROPERTIES[propertyName];
      if (!matchingProperty) {
        processNode(nodeValue, `${pathToNode}.${propertyName}`);
        continue;
      }

      const owner = getOwner(stacktapeConfig, pathToNode);
      if (!owner) {
        continue;
      }

      const values = Array.isArray(nodeValue) ? nodeValue : [nodeValue];
      for (const value of values) {
        if (typeof value !== 'string') {
          continue;
        }
        result.push({
          path: cleanPath(value),
          pathPropertyLocation: `${pathToNode}.${propertyName}`,
          ...(matchingProperty.oftenGenerated !== undefined && { oftenGenerated: matchingProperty.oftenGenerated }),
          ...owner
        });
      }
    }
  };

  processNode(stacktapeConfig, '');
  return result;
};
