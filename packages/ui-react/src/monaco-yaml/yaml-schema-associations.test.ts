import { describe, expect, test } from 'bun:test';
import { createYamlSchemaAssociations, getYamlModelPath } from './yaml-schema-associations.js';

describe('YAML schema associations', () => {
  const schemaUrl = 'https://console.stacktape.com/config-schema.json';

  test('whole configs, resource fragments and plain YAML get distinct model paths', () => {
    expect(getYamlModelPath({ editorNumber: 1, intellisense: true })).toBe('file:///stacktape-config-1.yaml');
    expect(getYamlModelPath({ editorNumber: 2, intellisense: true, rootSchemaIdentifier: 'WebService' })).toBe(
      'file:///stacktape-resource-2.yaml'
    );
    expect(getYamlModelPath({ editorNumber: 3, intellisense: false })).toBe('file:///yaml-3.yaml');
  });

  test('a whole config is associated with the canonical schema by its unique model filename', () => {
    const associations = createYamlSchemaAssociations(schemaUrl);
    associations.setModel('file:///stacktape-config-1.yaml', null);

    expect(associations.getSchemas()).toEqual([{ fileMatch: ['stacktape-config-1.yaml'], uri: schemaUrl }]);
  });

  test('resource editors keep independent exact schema roots', () => {
    const associations = createYamlSchemaAssociations(schemaUrl);
    associations.setModel('file:///stacktape-resource-1.yaml', 'WebService');
    associations.setModel('file:///stacktape-resource-2.yaml', 'RdsDatabase');

    expect(associations.getSchemas()).toEqual([]);
    associations.setCanonicalSchema({
      definitions: {
        WebService: { required: ['type'] },
        RdsDatabase: { required: ['properties'] },
        Shared: {}
      }
    });

    expect(associations.getSchemas()).toEqual([
      {
        fileMatch: ['stacktape-resource-1.yaml'],
        schema: {
          required: ['type'],
          definitions: {
            WebService: { required: ['type'] },
            RdsDatabase: { required: ['properties'] },
            Shared: {}
          }
        },
        uri: 'stacktape://config-schema/WebService'
      },
      {
        fileMatch: ['stacktape-resource-2.yaml'],
        schema: {
          required: ['properties'],
          definitions: {
            WebService: { required: ['type'] },
            RdsDatabase: { required: ['properties'] },
            Shared: {}
          }
        },
        uri: 'stacktape://config-schema/RdsDatabase'
      }
    ]);
  });

  test('changing and removing one root never changes another editor', () => {
    const associations = createYamlSchemaAssociations(schemaUrl);
    associations.setModel('file:///one.yaml', 'WebService');
    associations.setModel('file:///two.yaml', 'RdsDatabase');
    associations.setCanonicalSchema({ definitions: { RdsDatabase: {} } });
    associations.setModel('file:///one.yaml', 'LambdaFunction');
    associations.remove('file:///one.yaml');

    expect(associations.size()).toBe(1);
    expect(associations.getSchemas().at(0)).toEqual({
      fileMatch: ['two.yaml'],
      schema: { definitions: { RdsDatabase: {} } },
      uri: 'stacktape://config-schema/RdsDatabase'
    });
  });

  test('definition names are encoded in their distinct schema handles', () => {
    const associations = createYamlSchemaAssociations(schemaUrl);
    associations.setModel('file:///one.yaml', 'name/with~characters');
    associations.setCanonicalSchema({ definitions: { 'name/with~characters': {} } });

    expect(associations.getSchemas().at(0)).toEqual({
      fileMatch: ['one.yaml'],
      schema: {
        definitions: { 'name/with~characters': {} }
      },
      uri: 'stacktape://config-schema/name%2Fwith~characters'
    });
  });
});
