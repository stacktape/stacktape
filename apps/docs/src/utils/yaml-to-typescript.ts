import { convertYamlToTypescript as convertYamlToTypescriptShared } from '@stacktape/config-authoring/converter';

const convertForDocumentation = (convert: (source: string) => string, source: string): string | null => {
  try {
    return convert(source);
  } catch {
    // A code block may be an incomplete teaching fragment rather than a complete Stacktape configuration.
    return null;
  }
};

export const convertYamlToTypescript = (yaml: string): string | null =>
  convertForDocumentation(convertYamlToTypescriptShared, yaml);
