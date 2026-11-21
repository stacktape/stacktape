import type { JSONSchema, SchemasSettings } from 'monaco-yaml';

const getModelFileName = (modelUri: string) => modelUri.slice(modelUri.lastIndexOf('/') + 1);

const getRootSchemaAssociation = ({
  canonicalSchema,
  modelUri,
  rootSchemaIdentifier
}: {
  canonicalSchema: JSONSchema;
  modelUri: string;
  rootSchemaIdentifier: string;
}): SchemasSettings => {
  const rootSchema = canonicalSchema.definitions?.[rootSchemaIdentifier];
  return {
    fileMatch: [getModelFileName(modelUri)],
    // Keep the canonical definitions together so internal refs resolve, but copy the selected
    // definition itself to the document root. monaco-yaml does not select a remote URI fragment as
    // the root, and an extra wrapper ref obscures completions in yaml-language-server.
    schema: {
      ...rootSchema,
      definitions: canonicalSchema.definitions
    } as JSONSchema,
    uri: `stacktape://config-schema/${encodeURIComponent(rootSchemaIdentifier)}`
  };
};

export const getYamlModelPath = ({
  editorNumber,
  intellisense,
  rootSchemaIdentifier
}: {
  editorNumber: number;
  intellisense: boolean;
  rootSchemaIdentifier?: string | null;
}) => {
  if (!intellisense) {
    return `file:///yaml-${editorNumber}.yaml`;
  }
  return rootSchemaIdentifier
    ? `file:///stacktape-resource-${editorNumber}.yaml`
    : `file:///stacktape-config-${editorNumber}.yaml`;
};

/**
 * Schema associations for the official `monaco-yaml` worker.
 *
 * Each model gets a generated, unique filename because yaml-language-server matches schema globs
 * against filenames rather than full Monaco URIs. Resource editors can therefore use different
 * definitions as their roots, while a plain YAML viewer does not inherit the Stacktape schema.
 */
export const createYamlSchemaAssociations = (schemaUrl: string) => {
  const rootByModelUri = new Map<string, string | null>();
  let canonicalSchema: JSONSchema | null = null;

  const getSchemas = (): SchemasSettings[] =>
    [...rootByModelUri].flatMap(([modelUri, rootSchemaIdentifier]) => {
      if (!rootSchemaIdentifier) {
        return [{ fileMatch: [getModelFileName(modelUri)], uri: schemaUrl }];
      }
      return canonicalSchema ? [getRootSchemaAssociation({ canonicalSchema, modelUri, rootSchemaIdentifier })] : [];
    });

  return {
    getSchemas,
    setCanonicalSchema(schema: JSONSchema) {
      canonicalSchema = schema;
    },
    setModel(modelUri: string, rootSchemaIdentifier: string | null) {
      const hadModel = rootByModelUri.has(modelUri);
      const previous = rootByModelUri.get(modelUri);
      rootByModelUri.set(modelUri, rootSchemaIdentifier);
      return !hadModel || previous !== rootSchemaIdentifier;
    },
    remove(modelUri: string) {
      return rootByModelUri.delete(modelUri);
    },
    size: () => rootByModelUri.size
  };
};
