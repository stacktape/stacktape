import fs from 'node:fs';
import { CLOUDFORM_FOLDER_PATH, CLOUDFORM_ROOT_HELPER_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { prettify } from '@shared/utils/prettier';
import { copy, mkdir, remove } from 'fs-extra';
import camelCase from 'lodash/camelCase';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import merge from 'lodash/merge';
import pickBy from 'lodash/pickBy';
import some from 'lodash/some';

const IGNORED_SERVICES = [
  'Pinpoint',
  'Greengrass',
  'ImageBuilder',
  'PinpointEmail',
  'RoboMaker',
  'ServiceCatalog',
  'GameLift',
  'GroundStation',
  'Guard​Duty',
  'OpsWorks'
];

const SchemaUrls: { [key: string]: string } = {
  'ap-south-1': 'https://d2senuesg1djtx.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'ap-northeast-3': 'https://d2zq80gdmjim8k.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'ap-northeast-2': 'https://d1ane3fvebulky.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'ap-southeast-1': 'https://doigdx0kgq9el.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'ap-southeast-2': 'https://d2stg8d246z9di.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'ap-northeast-1': 'https://d33vqc0rt9ld30.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'ca-central-1': 'https://d2s8ygphhesbe7.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'eu-central-1': 'https://d1mta8qj7i28i2.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'eu-west-1': 'https://d3teyb21fexa9r.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'eu-west-2': 'https://d1742qcu2c1ncx.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'eu-west-3': 'https://d2d0mfegowb3wk.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'sa-east-1': 'https://d3c9jyj3w509b0.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'us-east-1': 'https://d1uauaxba7bl26.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'us-east-2': 'https://dnwj8swjjbsbt.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'us-west-1': 'https://d68hl49wbnanq.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json',
  'us-west-2': 'https://d201a2mn26r7lk.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json'
};

type BasicTypeSuffix = 'Type' | 'ItemType';

type TypeProperties = {
  Type?: string;
  ItemType?: string;
  PrimitiveType?: string;
  PrimitiveItemType?: string;
  Required: boolean;
};

type TypeAttributes = {
  PrimitiveType?: string;
};

type TypePropertiesMap = { [key: string]: TypeProperties };
type TypeAttributesMap = { [key: string]: TypeAttributes };

type ResourceType = {
  Properties: TypePropertiesMap;
  Attributes?: TypeAttributesMap;
};

type ResourceTypeMap = { [key: string]: ResourceType };

type Schema = {
  ResourceSpecificationVersion: string;
  ResourceTypes: ResourceTypeMap;
  PropertyTypes: ResourceTypeMap;
};

function adjustedCamelCase(input: string): string {
  return input === 'IoT' ? 'iot' : camelCase(input);
}

function determineTypeScriptType(property: TypeProperties, propertyName: string, typeSuffix: BasicTypeSuffix): string {
  if (property[typeSuffix] === 'List') {
    // avoid infinite recursion (list of list)
    const itemType = property.ItemType === 'List' ? 'any' : determineTypeScriptType(property, propertyName, 'ItemType');
    return `List<${itemType}>`;
  }
  if (property[typeSuffix] === 'Map') {
    return `{[key: string]: ${determineTypeScriptType(property, propertyName, 'ItemType')}}`;
  }
  if (property[typeSuffix] === 'Tag') {
    return 'ResourceTag';
  }
  if (property[typeSuffix]) {
    return innerTypeName(`.${property[typeSuffix]}`);
  }
  // @ts-expect-error - Documentation is optional
  if (property.Documentation && Object.keys(property).length === 1) {
    return 'string';
  }

  let primitiveType = property[typeSuffix === 'Type' ? 'PrimitiveType' : 'PrimitiveItemType']?.toLowerCase();
  if (!primitiveType) {
    // @note this is a fix for probably a bug on AWS side...
    // console.info(typeSuffix, property);
    // Type {
    //   Documentation: 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kms-key.html#cfn-kms-key-keypolicy',
    //   UpdateType: 'Mutable',
    //   Required: true
    // }
    return 'any';
  }
  if (['json', 'map'].includes(primitiveType)) {
    return '{[key: string]: any}';
  }
  if (['integer', 'double', 'long'].includes(primitiveType)) {
    primitiveType = 'number';
  }
  if (primitiveType === 'timestamp') {
    primitiveType = 'string';
  }
  return `${primitiveType}`;
}

function propertiesEntries(properties: TypePropertiesMap, useNonNullAssertion = false): string[] {
  const nonOptionalPostfix = useNonNullAssertion ? '!' : '';
  return map(properties, (property: TypeProperties, propertyName: string) => {
    return `${propertyName}${property.Required ? nonOptionalPostfix : '?'}: ${determineTypeScriptType(
      property,
      propertyName,
      'Type'
    )}`;
  });
}

function hasTags(properties: { [key: string]: TypeProperties }): boolean {
  return Object.keys(properties).includes('Tags') || some(properties, (p) => p.Type === 'List' && p.ItemType === 'Tag');
}

function innerTypeName(innerTypeFullName: string): string {
  const [containingTypeFullName, innerTypeName] = innerTypeFullName.split('.');
  const containingTypeName = containingTypeFullName.split(':').pop();

  if (innerTypeName === containingTypeName) {
    return `${innerTypeName}Inner`;
  }

  return innerTypeName;
}

function generateInnerClass(name: string, properties: TypePropertiesMap): string {
  return `export class ${name} {
${propertiesEntries(properties, true)
  .map((e) => `    ${e}`)
  .join('\n')}
    constructor(properties: ${name}) {
        Object.assign(this, properties)
    }
}`;
}

function generateInnerType(name: string, type: TypeProperties) {
  return `export type ${name} = ${determineTypeScriptType(type, '_t', 'Type')}`;
}

function generateTopLevelClass(
  namespace: string,
  typeName: string,
  properties: TypePropertiesMap,
  innerTypes: ResourceTypeMap
) {
  const canOmitProperties = Object.keys(properties).every((prop) => !properties[prop].Required);

  return `export interface ${typeName}Properties {
${propertiesEntries(properties)
  .map((e) => `    ${e}`)
  .join('\n')}
}
export default class ${typeName} extends ResourceBase<${typeName}Properties> {
${Object.keys(innerTypes)
  .filter((innerType) => !!innerTypes[innerType].Properties)
  .map((innerTypeFullName) => {
    const [, innerTypeNameUnsafe] = innerTypeFullName.split('.');
    const innerTypeNameSafe = innerTypeName(innerTypeFullName);
    return `    static ${innerTypeNameUnsafe} = ${innerTypeNameSafe}`;
  })
  .join('\n')}
    constructor(properties${canOmitProperties ? '?' : ''}: ${typeName}Properties) {
        super('AWS::${namespace}::${typeName}', properties${canOmitProperties ? ' || {}' : ''})
    }
}`;
}

function generateFile(
  namespace: string,
  resourceName: string,
  properties: TypePropertiesMap,
  innerTypes: ResourceTypeMap
): void {
  let innerHasTags = false;
  const innerTypesTemplates = map(innerTypes, (innerType: ResourceType, innerTypeFullName: string) => {
    const resolvedInnerTypeName = innerTypeName(innerTypeFullName);
    if (innerType.Properties) {
      innerHasTags = innerHasTags || hasTags(innerType.Properties);
      return generateInnerClass(resolvedInnerTypeName, innerType.Properties);
    }
    return generateInnerType(resolvedInnerTypeName, innerType as any);
  });

  const resourceImports = ['ResourceBase'];
  if (innerHasTags || hasTags(properties)) {
    resourceImports.push('ResourceTag');
  }

  const generatedClass = generateTopLevelClass(namespace, resourceName, properties, innerTypes);

  const template = `import {${resourceImports.join(', ')}} from '../resource'
${innerTypesTemplates.join('\n\n')}
${generatedClass}
`;

  if (!fs.existsSync(`${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}`)) {
    fs.mkdirSync(`${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}`);
  }

  fs.writeFileSync(`${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}/${camelCase(resourceName)}.ts`, template, {
    encoding: 'utf8'
  });
}

function generateIndexNamespaceFile(namespace: string, resourceTypeNames: string[]): void {
  const imports = resourceTypeNames.map((typeName) => `import ${typeName}_ from './${camelCase(typeName)}'`);

  const template = `${imports.join('\n')}
export namespace ${namespace} {
${resourceTypeNames.map((typeName) => `  export const ${typeName} = ${typeName}_`).join('\n')}
${resourceTypeNames.map((typeName) => `  export type ${typeName} = ${typeName}_`).join('\n')}
}
`;

  fs.writeFileSync(`${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}/index.namespace.ts`, template, {
    encoding: 'utf8'
  });
}

function generateIndexReexportFile(namespace: string): void {
  const template = `import {${namespace}} from './index.namespace'
export default ${namespace}
`;

  fs.writeFileSync(`${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}/index.ts`, template, { encoding: 'utf8' });
}

function generateFilesFromSchema(schema: Schema, resourceSources: { [key: string]: string[] }) {
  const regionsUsed = new Set<string>();
  const indexContent: { [key: string]: string[] } = {};
  const allResourceNames = [];
  forEach(schema.ResourceTypes, (resource: ResourceType, resourceFullName: string) => {
    const [, namespace, typeName] = resourceFullName.split('::');
    if (!IGNORED_SERVICES.includes(namespace)) {
      const properties = resource.Properties || {};
      allResourceNames.push(resourceFullName);
      resourceSources[resourceFullName].forEach((region) => regionsUsed.add(region));
      const resourcePropertyTypes = pickBy(
        schema.PropertyTypes,
        (propertyType: ResourceType, propertyFullName: string) => propertyFullName.startsWith(`${resourceFullName}.`)
      ) as ResourceTypeMap;

      indexContent[namespace] = indexContent[namespace] || [];
      indexContent[namespace].push(typeName);

      generateFile(namespace, typeName, properties, resourcePropertyTypes);
    }
  });

  forEach(indexContent, (resourceTypeNames: string[], namespace: string) => {
    generateIndexNamespaceFile(namespace, resourceTypeNames);
    generateIndexReexportFile(namespace);
  });

  const resourceTypesTemplate = `export type CloudformationResourceType = \n\t${allResourceNames
    .sort()
    .map((name) => `'${name}'`)
    .join(' |\n\t')}`;

  fs.writeFileSync(`${CLOUDFORM_FOLDER_PATH}/resource-types.ts`, resourceTypesTemplate, { encoding: 'utf8' });
}

async function generateSchemas() {
  const schemas: { [key: string]: Schema } = {};
  const schemaVersions: { [key: string]: string } = {};
  const resourceSources: { [key: string]: string[] } = {};

  const mergedSchemaPromises = Object.keys(SchemaUrls).map((region) => {
    const schemaUrl = SchemaUrls[region];

    return fetch(schemaUrl)
      .then((res: Response) => res.json())
      .then((schema: Schema) => {
        schemas[region] = schema;
        schemaVersions[region] = schema.ResourceSpecificationVersion;

        forEach(schema.ResourceTypes, (_resource: ResourceType, resourceFullName: string) => {
          if (!resourceSources[resourceFullName]) {
            resourceSources[resourceFullName] = [];
          }

          resourceSources[resourceFullName].push(region);
        });
      });
  });

  await Promise.all(mergedSchemaPromises);
  let mergedSchema: Schema;
  Object.keys(SchemaUrls)
    .sort()
    .forEach((region1) => {
      mergedSchema = merge(mergedSchema || {}, schemas[region1]);
    });

  generateFilesFromSchema(mergedSchema!, resourceSources);
}

export const generateCloudform = async () => {
  logInfo('Generating cloudform...');
  await remove(CLOUDFORM_FOLDER_PATH);
  await mkdir(CLOUDFORM_FOLDER_PATH);
  await copy(CLOUDFORM_ROOT_HELPER_FOLDER_PATH, CLOUDFORM_FOLDER_PATH);
  await generateSchemas();
  await prettify('@generated/cloudform');
  logSuccess('Cloudform generated successfully.');
};

if (import.meta.main) {
  generateCloudform();
}
