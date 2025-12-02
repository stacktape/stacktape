// type DescriptionDirective = typeof ALLOWED_DESCRIPTION_DIRECTIVES[number];

export const generateTypeReferenceTree = ({
  definitionName,
  definitions
}: {
  definitionName: string;
  definitions: { [defName: string]: SchemaNode };
}) => {
  let toBeProcessed = [definitionName];
  const resultTree: { [defName: string]: string[] } = {};

  while (toBeProcessed.length) {
    const defNameToProcess = toBeProcessed.pop();
    if (resultTree[defNameToProcess]) {
      continue;
    }
    const defToProcess = definitions[defNameToProcess];
    if (!defToProcess) {
      console.log(resultTree, defNameToProcess);
    }
    const referencedTypes = Object.entries(defToProcess.properties || {})
      .map(([propertyName, propertySpec]) => {
        // if (
        //   getPropertyTypeInfo({ propertySpec, propertyName, definitions }).allowedTypes === undefined

        // ) {
        //   console.log(propertyName, getPropertyTypeInfo({ propertySpec, propertyName, definitions }));
        // }
        return getPropertyTypeInfo({ propertySpec, propertyName, definitions })
          .allowedTypes.filter(({ jsonSchemaDefinitionRef }) => jsonSchemaDefinitionRef)
          .map(({ jsonSchemaDefinitionRef }) => getTypeNameFromReference({ reference: jsonSchemaDefinitionRef }));
      })
      .flat();

    resultTree[defNameToProcess] = referencedTypes;
    toBeProcessed = toBeProcessed.concat(referencedTypes);
  }
  return resultTree;
};

const isPrimitiveType = ({ propertySpec }: { propertySpec: SchemaNode }) => {
  return (
    ['string', 'number', 'boolean'].includes(propertySpec.type) ||
    (Array.isArray(propertySpec.type) &&
      propertySpec.type.every((type) => ['string', 'number', 'boolean'].includes(type)))
  );
};

const isUnspecifiedObject = ({ propertySpec }: { propertySpec: SchemaNode }) => {
  return (
    propertySpec.type === 'object' &&
    !propertySpec.properties &&
    Object.keys(propertySpec.additionalProperties).length <= 1
  );
};

export const getIsRequired = ({ definition, propName }: { definition: SchemaNode; propName: string }) => {
  return (
    definition.required?.includes(propName) ||
    (definition.properties?.[propName] as any)?._MdxDesc?.ld?.includes('--stp-required--')
  );
};

export const getPropertyTypeInfo = ({
  propertySpec,
  propertyName,
  definitions
}: {
  propertySpec: SchemaNode;
  propertyName?: string;
  definitions: { [defName: string]: SchemaNode };
}): { allowedTypes: AllowedType[]; isArray: boolean } => {
  let isArray = false;
  let specToExamine = propertySpec;
  if (propertySpec.type === 'array') {
    isArray = true;
    specToExamine = propertySpec.items;
  }

  if (specToExamine.anyOf) {
    return { allowedTypes: getAllowedTypesFromAnyOfSpec({ propertySpec: specToExamine, definitions }), isArray };
  }

  if (specToExamine.$ref) {
    return { allowedTypes: getAllowedTypesFromRefSpec({ propertySpec: specToExamine, definitions }), isArray };
  }

  if (isPrimitiveType({ propertySpec: specToExamine })) {
    return { allowedTypes: getAllowedTypesFromPrimitiveSpec({ propertySpec: specToExamine }), isArray };
  }
  // this happens when value is of shape "{[name:string]: any}" in typescript
  // we are also hardcoding this for properties called "overrides" - this property name should only be used at root for resource overrides
  // we allow this type for specifying unknown objects
  if (isUnspecifiedObject({ propertySpec: specToExamine }) || propertyName === 'overrides') {
    return { allowedTypes: [{ typeName: 'Object' }], isArray };
  }

  // this happens when value is defined as "any" in typescript
  // in json schema this property has only "description" property
  // we want to allow this for values that are complex object, we know little about
  if (
    typeof specToExamine === 'object' &&
    (!Object.keys(specToExamine).length ||
      (Object.keys(specToExamine).length === 1 && Object.keys(specToExamine)[0] === 'description'))
  ) {
    return { allowedTypes: [{ typeName: 'UNSPECIFIED' }], isArray };
  }

  console.warn(`Could not parse "${propertyName}" property type info. Spec: ${JSON.stringify(specToExamine, null, 2)}`);
};

export const getPropertyDescriptionInfo = ({
  definitionName,
  definitions,
  propertyName
}: {
  definitionName: string;
  definitions: { [defName: string]: ObjectSchemaNode };
  propertyName: string;
}): { sd: string; ld: string } => {
  if (!definitions[definitionName]?.properties?.[propertyName]) {
    console.warn(`No property "${propertyName}" in ${definitionName}`);
  }

  let ld = (definitions[definitionName]?.properties?.[propertyName] as any)?._MdxDesc?.ld;
  let sd = (definitions[definitionName]?.properties?.[propertyName] as any)?._MdxDesc?.sd;
  // sometimes descriptions are in the "ref"-ed objects instead of on properties themselves (after ts-to-json-schema upgrade)
  const definitionReference = (definitions[definitionName]?.properties?.[propertyName] as any)?.$ref;
  if (!sd && definitionReference) {
    ld = (definitions[getTypeNameFromReference({ reference: definitionReference })] as any)?._MdxDesc?.ld;
    sd = (definitions[getTypeNameFromReference({ reference: definitionReference })] as any)?._MdxDesc?.sd;
  }

  if (!sd || !ld) {
    console.error(`No ${sd ? '' : 'short'} ${ld ? '' : 'long'} description on ${propertyName} in ${definitionName}`);
    console.error(definitions[definitionName]);
  }

  ld = ld?.replaceAll('--stp-required--', '');

  return { ld, sd };
};

export const definitionHasProperty = ({
  definitionName,
  definitions,
  propertyName
}: {
  definitionName: string;
  definitions: { [defName: string]: ObjectSchemaNode };
  propertyName: string;
}) => !!definitions[definitionName]?.properties?.[propertyName];

export const getSchemaReferer = ({
  definitionName,
  definitions,
  searchForReferencesInDefinition
}: {
  definitionName: string;
  definitions: { [defName: string]: ObjectSchemaNode };
  searchForReferencesInDefinition: string;
}): string[] => {
  if (!searchForReferencesInDefinition) {
    return [];
  }
  const referer: string[] = [];
  const referenceTree = generateTypeReferenceTree({ definitions, definitionName: searchForReferencesInDefinition });
  Object.entries(referenceTree).forEach(([refererDefinitionName, references]) => {
    if (references.includes(definitionName)) {
      referer.push(refererDefinitionName);
    }
  });
  return referer;
};

export const getTypeNameFromReference = ({ reference }: { reference: string }) => {
  return reference.slice(14);
};

const getAllowedTypesFromAnyOfSpec = ({
  propertySpec,
  definitions
}: {
  propertySpec: SchemaNode;
  definitions: { [defName: string]: SchemaNode };
}) => {
  const allowedTypes: AllowedType[] = [];
  let containsNodes: 'primitive' | 'complex';
  propertySpec.anyOf.forEach((alType) => {
    // if property references some inner complex object
    if (alType.$ref) {
      if (containsNodes === 'primitive') {
        throw new Error(
          `Type "${JSON.stringify(alType)}" is unexpected in type "${JSON.stringify(
            propertySpec
          )}". AnyOf cannot contain both primitive and complex types`
        );
      }
      containsNodes = 'complex';
      allowedTypes.push(...getAllowedTypesFromRefSpec({ propertySpec: alType, definitions }));
    }
    // if property is primitive value
    else if (['string', 'number', 'boolean'].includes(alType.type)) {
      if (containsNodes === 'complex') {
        throw new Error(
          `Type "${JSON.stringify(alType)}" is unexpected in type "${JSON.stringify(
            propertySpec
          )}". AnyOf cannot contain both primitive and complex types`
        );
      }
      containsNodes = 'primitive';
      allowedTypes.push(...getAllowedTypesFromPrimitiveSpec({ propertySpec: alType }));
    } else if (typeof alType === 'object' && !Object.keys(alType).length) {
      return allowedTypes.push({ typeName: 'UNSPECIFIED' });
    } else {
      throw new Error(`Type "${JSON.stringify(alType)}" is unexpected in type "${JSON.stringify(propertySpec)}"`);
    }
  });
  return allowedTypes;
};

const getAllowedTypesFromRefSpec = ({
  propertySpec,
  definitions
}: {
  propertySpec: SchemaNode;
  definitions: { [defName: string]: SchemaNode };
}): AllowedType[] => {
  const typeName = getTypeNameFromReference({ reference: propertySpec.$ref });
  const referencedSpec = definitions[typeName];
  // we check if the reference does not only reference primitive value
  // if it does we return directly the type of the primitive value
  if (isPrimitiveType({ propertySpec: referencedSpec })) {
    return getAllowedTypesFromPrimitiveSpec({ propertySpec: referencedSpec });
  }
  // special treatment for any kind kind of Record<something, something> in typescript
  if (/Record<[a-zA-Z0-9]+,[a-zA-Z0-9]+>/.test(typeName)) {
    const [keyType, valueType] = typeName.slice(typeName.indexOf('<') + 1, typeName.indexOf('>')).split(',');
    return [{ typeName: `Object - { ${keyType} : ${valueType} }` }];
  }
  return [
    {
      typeName,
      jsonSchemaDefinitionRef: propertySpec.$ref
    }
  ];
};

const getAllowedTypesFromPrimitiveSpec = ({ propertySpec }: { propertySpec: SchemaNode }): AllowedType[] => {
  if (Array.isArray(propertySpec.type)) {
    return propertySpec.type.map((type) => ({ typeName: type }));
  }
  return [
    {
      typeName: propertySpec.type,
      enumeratedValues: propertySpec.enum ? propertySpec.enum : propertySpec.const ? [propertySpec.const] : undefined
    }
  ];
};
