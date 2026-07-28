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

/**
 * The names this generator imports from the cloudform root helpers and emits into property types.
 * A resource or one of its property types can be called `List`, `Value` or `ResourceTag`
 * (`AWS::FraudDetector::List`, `AWS::Connect::DataTableRecord.Value`, `AWS::Budgets::Budget.ResourceTag`),
 * and those class names are customer facing. The helper import is aliased instead, and only in the files
 * where the collision actually occurs.
 */
type HelperTypeNames = { resourceBase: string; resourceTag: string; value: string; list: string };

const UNALIASED_HELPER_TYPE_NAMES: HelperTypeNames = {
  resourceBase: 'ResourceBase',
  resourceTag: 'ResourceTag',
  value: 'Value',
  list: 'List'
};

/** Prefix used for generated helper aliases. */
const HELPER_ALIAS_PREFIX = 'Cfn';

function resolveHelperTypeNames(localTypeNames: ReadonlySet<string>): HelperTypeNames {
  const occupiedNames = new Set(localTypeNames);
  const aliasWhenShadowed = (helperName: string) => {
    if (!occupiedNames.has(helperName)) {
      occupiedNames.add(helperName);
      return helperName;
    }

    const aliasBase = `${HELPER_ALIAS_PREFIX}${helperName}`;
    let alias = aliasBase;
    let suffix = 2;
    while (occupiedNames.has(alias)) {
      alias = `${aliasBase}${suffix}`;
      suffix += 1;
    }
    occupiedNames.add(alias);
    return alias;
  };

  return {
    resourceBase: aliasWhenShadowed(UNALIASED_HELPER_TYPE_NAMES.resourceBase),
    resourceTag: aliasWhenShadowed(UNALIASED_HELPER_TYPE_NAMES.resourceTag),
    value: aliasWhenShadowed(UNALIASED_HELPER_TYPE_NAMES.value),
    list: aliasWhenShadowed(UNALIASED_HELPER_TYPE_NAMES.list)
  };
}

function importSpecifier(exportedName: string, localName: string): string {
  return exportedName === localName ? exportedName : `${exportedName} as ${localName}`;
}

/** Module names this generator owns in every namespace directory. A resource may not take them. */
const GENERATOR_OWNED_MODULE_NAMES = ['index', 'index.namespace'];

/**
 * `AWS::Kendra::Index` and four sibling `Index` resources camel-case to `index`, which is also the name of
 * the namespace re-export module. The resource file used to be written first and then overwritten by the
 * re-export, so those resources disappeared from the generated tree while `resource-types.ts` still listed
 * them and `index.namespace.ts` imported a namespace where it expected a class.
 */
export function resourceModuleName(resourceName: string): string {
  const moduleName = camelCase(resourceName);
  return GENERATOR_OWNED_MODULE_NAMES.includes(moduleName) ? `${moduleName}Resource` : moduleName;
}

function assertUniqueResourceModuleNames(resourceTypeNames: string[]): void {
  const ownersByModuleName = new Map<string, string>();
  for (const resourceTypeName of resourceTypeNames) {
    const moduleName = resourceModuleName(resourceTypeName);
    const existingOwner = ownersByModuleName.get(moduleName);
    if (existingOwner) {
      throw new Error(
        `CloudFormation resources ${existingOwner} and ${resourceTypeName} both map to module ${moduleName}.`
      );
    }
    ownersByModuleName.set(moduleName, resourceTypeName);
  }
}

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

function determineTypeScriptType(
  property: TypeProperties,
  propertyName: string,
  typeSuffix: BasicTypeSuffix,
  helpers: HelperTypeNames = UNALIASED_HELPER_TYPE_NAMES
): string {
  if (property[typeSuffix] === 'List') {
    // avoid infinite recursion (list of list)
    const itemType =
      property.ItemType === 'List' ? 'any' : determineTypeScriptType(property, propertyName, 'ItemType', helpers);
    return `${helpers.list}<${itemType}>`;
  }
  if (property[typeSuffix] === 'Map') {
    return `{[key: string]: ${determineTypeScriptType(property, propertyName, 'ItemType', helpers)}}`;
  }
  if (property[typeSuffix] === 'Tag') {
    return helpers.resourceTag;
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
  return `${helpers.value}<${primitiveType}>`;
}

function propertiesEntries(
  properties: TypePropertiesMap,
  helpers: HelperTypeNames,
  useNonNullAssertion = false
): string[] {
  const nonOptionalPostfix = useNonNullAssertion ? '!' : '';
  return map(properties, (property: TypeProperties, propertyName: string) => {
    return `${propertyName}${property.Required ? nonOptionalPostfix : '?'}: ${determineTypeScriptType(
      property,
      propertyName,
      'Type',
      helpers
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

function generateInnerClass(name: string, properties: TypePropertiesMap, helpers: HelperTypeNames): string {
  return `export class ${name} {
${propertiesEntries(properties, helpers, true)
  .map((e) => `    ${e}`)
  .join('\n')}
    constructor(properties: ${name}) {
        Object.assign(this, properties)
    }
}`;
}

function generateInnerType(name: string, type: TypeProperties, helpers: HelperTypeNames) {
  return `export type ${name} = ${determineTypeScriptType(type, '_t', 'Type', helpers)}`;
}

function generateTopLevelClass(
  namespace: string,
  typeName: string,
  properties: TypePropertiesMap,
  innerTypes: ResourceTypeMap,
  helpers: HelperTypeNames
) {
  const canOmitProperties = Object.keys(properties).every((prop) => !properties[prop].Required);

  return `export interface ${typeName}Properties {
${propertiesEntries(properties, helpers)
  .map((e) => `    ${e}`)
  .join('\n')}
}
export default class ${typeName} extends ${helpers.resourceBase}<${typeName}Properties> {
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

export function buildResourceModule(
  namespace: string,
  resourceName: string,
  properties: TypePropertiesMap,
  innerTypes: ResourceTypeMap
): string {
  const declaredTypeNames = new Set([resourceName, ...map(innerTypes, (_, fullName) => innerTypeName(fullName))]);
  const helpers = resolveHelperTypeNames(declaredTypeNames);

  let innerHasTags = false;
  const innerTypesTemplates = map(innerTypes, (innerType: ResourceType, innerTypeFullName: string) => {
    const resolvedInnerTypeName = innerTypeName(innerTypeFullName);
    if (innerType.Properties) {
      innerHasTags = innerHasTags || hasTags(innerType.Properties);
      return generateInnerClass(resolvedInnerTypeName, innerType.Properties, helpers);
    }
    return generateInnerType(resolvedInnerTypeName, innerType as any, helpers);
  });

  const resourceImports = [importSpecifier(UNALIASED_HELPER_TYPE_NAMES.resourceBase, helpers.resourceBase)];
  if (innerHasTags || hasTags(properties)) {
    resourceImports.push(importSpecifier(UNALIASED_HELPER_TYPE_NAMES.resourceTag, helpers.resourceTag));
  }
  const dataTypeImports = [
    importSpecifier(UNALIASED_HELPER_TYPE_NAMES.value, helpers.value),
    importSpecifier(UNALIASED_HELPER_TYPE_NAMES.list, helpers.list)
  ];

  const generatedClass = generateTopLevelClass(namespace, resourceName, properties, innerTypes, helpers);

  return `import {${resourceImports.join(', ')}} from '../resource'
import { ${dataTypeImports.join(', ')} } from '../dataTypes'
${innerTypesTemplates.join('\n\n')}
${generatedClass}
`;
}

function generateFile(
  namespace: string,
  resourceName: string,
  properties: TypePropertiesMap,
  innerTypes: ResourceTypeMap
): void {
  const template = buildResourceModule(namespace, resourceName, properties, innerTypes);

  if (!fs.existsSync(`${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}`)) {
    fs.mkdirSync(`${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}`);
  }

  fs.writeFileSync(
    `${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}/${resourceModuleName(resourceName)}.ts`,
    template,
    { encoding: 'utf8' }
  );
}

export function buildIndexNamespaceModule(namespace: string, resourceTypeNames: string[]): string {
  assertUniqueResourceModuleNames(resourceTypeNames);
  const imports = resourceTypeNames.map((typeName) => `import ${typeName}_ from './${resourceModuleName(typeName)}'`);

  return `${imports.join('\n')}
export namespace ${namespace} {
${resourceTypeNames.map((typeName) => `  export const ${typeName} = ${typeName}_`).join('\n')}
${resourceTypeNames.map((typeName) => `  export type ${typeName} = ${typeName}_`).join('\n')}
}
`;
}

function generateIndexNamespaceFile(namespace: string, resourceTypeNames: string[]): void {
  fs.writeFileSync(
    `${CLOUDFORM_FOLDER_PATH}/${adjustedCamelCase(namespace)}/index.namespace.ts`,
    buildIndexNamespaceModule(namespace, resourceTypeNames),
    { encoding: 'utf8' }
  );
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
