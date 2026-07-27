import fs from 'node:fs';
import { cfTypeToFilePath, cfTypeToInterface } from './cloudform-utils';

export type PropertiesInterfacesResult = {
  content: string;
  generatedTypes: Set<string>;
};

/**
 * Generate Properties interfaces from cloudformation-ts-types files for all child resources.
 * The new types are already clean TypeScript types without Value<T> or List<T> wrappers.
 * Returns both the generated content and the set of type names that were generated.
 */
export function generatePropertiesInterfaces(CHILD_RESOURCES: any): PropertiesInterfacesResult {
  const processedTypes = new Set<string>();
  const results: string[] = [];

  // Extract from all child resources
  const resources = Object.values(CHILD_RESOURCES) as Array<Array<{ resourceType: string }>>;

  for (const resourceArray of resources) {
    for (const resource of resourceArray) {
      const mapping = cfTypeToInterface(resource.resourceType);
      if (!mapping) {
        continue;
      }

      // Skip already processed types
      if (processedTypes.has(mapping.typeName)) {
        continue;
      }

      const filePath = cfTypeToFilePath(resource.resourceType, process.cwd());
      if (!filePath || !fs.existsSync(filePath)) {
        console.warn(`[generate-cf-properties] File not found: ${filePath} for ${resource.resourceType}`);
        continue;
      }

      processedTypes.add(mapping.typeName);

      // Read the file content
      const content = fs.readFileSync(filePath, 'utf-8');

      // Remove the auto-generated comment at the top and keep the rest
      const lines = content.split('\n');
      const typeLines: string[] = [];
      let inType = false;

      for (const line of lines) {
        // Skip comments at the top
        if (line.startsWith('//') && !inType) {
          continue;
        }

        // Start capturing when we hit the export
        if (line.startsWith('export type') || line.startsWith('/**')) {
          inType = true;
        }

        if (inType) {
          typeLines.push(line);
        }
      }

      if (typeLines.length > 0) {
        results.push(typeLines.join('\n'));
      }
    }
  }

  return {
    content: results.join('\n\n'),
    generatedTypes: processedTypes
  };
}
