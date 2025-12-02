import { kebabCase } from 'change-case';
import sortBy from 'lodash/sortBy';
import { Fragment, useRef, useState } from 'react';
import useCollapse from 'react-hook-collapse';
import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { typographyCss } from '@/styles/global';
import { onMaxW500, onMaxW650 } from '@/styles/responsive';
import { capitalizeFirstLetter } from '@/utils/helpers';
import {
  getIsRequired,
  getPropertyTypeInfo,
  getSchemaReferer,
  getTypeNameFromReference
} from '@/utils/schema-extractor';
import configSchema from '../../../../@generated/schemas/config-schema.json';
import { border, box, colors } from '../../styles/variables';
import { Badge } from './Badge';

const buildApiReferenceTableId = ({ definitionName }: { definitionName: string }) => {
  return `api-ref_${kebabCase(definitionName)}`;
};

export type BadgeInfo = {
  isCompositeType: boolean;
  typeName: string;
  isEnum?: boolean;
  exactValue?: string | number;
};

type PropertyTypeInfo = BadgeInfo & {
  isArray: boolean;
  enumeratedValues: (string | number)[];
};

function PropertyTypeBadgeLine({
  badges,
  rewriteLinksForReferencedCompositeTypes
}: {
  badges: BadgeInfo[];
  rewriteLinksForReferencedCompositeTypes?: { [typeName: string]: string };
}) {
  return (
    <Fragment>
      {badges.map(({ isCompositeType, typeName, isEnum, exactValue }, idx) => {
        const isLast = badges.length - 1 === idx;
        const apiReferenceTableId =
          isCompositeType &&
          (rewriteLinksForReferencedCompositeTypes?.[typeName] ||
            `#${buildApiReferenceTableId({ definitionName: typeName })}`);

        const badgeText = `${typeName}${isEnum ? ' ENUM' : ''}${exactValue ? ` "${exactValue}"` : ''}`;
        return (
          <span key={badgeText}>
            {isCompositeType ? (
              <a
                onClick={(e) => {
                  e.stopPropagation();
                }}
                css={{
                  wordBreak: 'break-all'
                }}
                href={apiReferenceTableId}
              >
                <Badge backgroundColor="#00828b" hoverBackgroundColor={colors.primaryButtonBorder}>
                  {badgeText}
                </Badge>
              </a>
            ) : (
              <Badge css={{ wordBreak: 'break-all' }} backgroundColor={colors.gray}>
                {badgeText}
              </Badge>
            )}
            {!isLast && (
              <span>
                <span css={{ color: colors.fontColorPrimary, margin: '0px 2px' }}>or</span>
              </span>
            )}
          </span>
        );
      })}
    </Fragment>
  );
}

function ExpandableView({
  propertyTypeInfo,
  longDescription,
  shortDescription,
  rewriteLinksForReferencedCompositeTypes
}: {
  propertyTypeInfo;
  longDescription: string;
  shortDescription: string;
  rewriteLinksForReferencedCompositeTypes?: { [typeName: string]: string };
}) {
  const shouldShowPossibleValuesList = propertyTypeInfo.allowedTypes[0].enumeratedValues?.length > 1;
  const shortDesc = shortDescription
    ? shortDescription.startsWith('<p> ')
      ? `<p> ${capitalizeFirstLetter(shortDescription.slice(4))}`
      : capitalizeFirstLetter(shortDescription)
    : 'No description';

  const allowedPropertyTypes: PropertyTypeInfo[] = propertyTypeInfo.allowedTypes.map(
    ({ typeName, jsonSchemaDefinitionRef, enumeratedValues }) => {
      const exactValue = enumeratedValues?.length === 1 ? enumeratedValues[0] : null;
      return {
        enumeratedValues,
        typeName: jsonSchemaDefinitionRef ? getTypeNameFromReference({ reference: jsonSchemaDefinitionRef }) : typeName,
        isCompositeType: Boolean(jsonSchemaDefinitionRef),
        exactValue,
        isEnum: !exactValue && Boolean(enumeratedValues?.length),
        isArray: propertyTypeInfo.isArray
      };
    }
  );

  const possibleValues = allowedPropertyTypes
    .map(({ enumeratedValues }) => enumeratedValues || [])
    .flat()
    .sort((val1: any, val2: any) => {
      if (typeof val1 === 'number') {
        return Number(val1) - Number(val2);
      }
      return val1;
    });

  return (
    <div
      css={{
        color: colors.fontColorPrimary,
        lineHeight: 1.5,
        fontSize: '14px',
        paddingLeft: '7px',
        paddingBottom: '13px'
      }}
    >
      <p
        css={{
          fontSize: '15px',
          li: { lineHeight: '1.4 !important', fontSize: '14px !important' },
          fontWeight: 'bold',
          marginTop: '15px'
          // width: '100%'
        }}
        dangerouslySetInnerHTML={{ __html: shortDesc }}
      />
      <p
        css={{
          fontSize: '14px',
          color: colors.fontColorPrimary,
          lineHeight: 1.6,
          marginTop: '13px',
          wordBreak: 'break-all'
        }}
      >
        <span css={{ paddingRight: '3px' }}>Type: </span>
        {propertyTypeInfo.isArray && (
          <span
            css={{
              whiteSpace: 'nowrap',
              [onMaxW500]: {
                whiteSpace: 'normal'
              }
            }}
          >
            Array of&nbsp;
          </span>
        )}
        <PropertyTypeBadgeLine
          badges={allowedPropertyTypes}
          rewriteLinksForReferencedCompositeTypes={rewriteLinksForReferencedCompositeTypes}
        />
      </p>
      {shouldShowPossibleValuesList && (
        <p css={{ paddingBottom: '6px', marginTop: '14px', lineHeight: 1.6, wordBreak: 'break-all' }}>
          <span css={{ paddingRight: '3px' }}>Possible values: </span>
          {possibleValues.map((allowedType) => (
            <Badge key={allowedType} backgroundColor="#656565">
              {allowedType}
            </Badge>
          ))}
        </p>
      )}
      {longDescription ? (
        <div
          css={{
            marginTop: '14px',
            p: { lineHeight: '1.7 !important', fontSize: '14px !important' },
            li: { lineHeight: '1.6 !important', fontSize: '14px !important' },
            a: { fontWeight: 'bold !important' as any },
            pre: {
              backgroundColor: colors.darkerBackground,
              overflowX: 'auto',
              overflowY: 'hidden'
            }
            // '*': { whiteSpace: 'normal' }
          }}
          dangerouslySetInnerHTML={{ __html: longDescription.replaceAll('--stp-required--', '') }}
        />
      ) : null}
    </div>
  );
}

export function PropertyInfo({
  propertyName,
  idx,
  propertyRequired,
  propertyTypeInfo,
  shortDescription,
  longDescription,
  defaultValue,
  isLast,
  rewriteLinksForReferencedCompositeTypes
}: {
  propertyName: string;
  idx: number;
  propertyRequired: boolean;
  propertyTypeInfo: {
    allowedTypes: AllowedType[];
    isArray: boolean;
  };
  isLast: boolean;
  shortDescription: string;
  longDescription: string;
  defaultValue?: string;
  rewriteLinksForReferencedCompositeTypes?: { [typeName: string]: string };
}) {
  const [open, setOpen] = useState(false);
  const oddRowColor = colors.darkerBackground;
  const evenRowColor = colors.backgroundColor;
  const ref = useRef(null);
  useCollapse(ref, open);
  return (
    <div
      css={{
        backgroundColor: idx % 2 === 0 ? evenRowColor : oddRowColor,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        position: 'relative',
        width: '100%',
        borderRadius: isLast ? '0px 0px 6px 6px' : 'initial',
        paddingBottom: isLast ? '1px' : '0px',
        borderLeft: `2px solid ${colors.darkerBackground}`,
        borderRight: `2px solid ${colors.darkerBackground}`
      }}
      onClick={() => setOpen(!open)}
      aria-label={`${open ? 'collapse row' : 'expand row'}`}
    >
      <div css={{ width: '100%', padding: '4px 6px 6px 7px', overflowX: 'hidden' }}>
        <div
          css={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '3px',
            alignItems: 'center',
            wordBreak: 'break-word'
          }}
        >
          <span
            css={{
              ...typographyCss,
              margin: '0px',
              padding: '0px 7px',
              lineHeight: 1.75,
              // fontSize: '14px',
              marginLeft: '2px',
              color: colors.fontColorPrimary,
              height: '100%',
              border,
              borderRadius: '4px',
              letterSpacing: 0.8,
              backgroundColor: '#292929',
              userSelect: 'none'
            }}
          >
            {propertyName}
          </span>
          <div css={{ display: 'flex', alignItems: 'center', overflow: 'hidden', height: '26px' }}>
            <div css={{ '*': { userSelect: 'none' } }}>
              {defaultValue !== undefined && (
                <span css={{ top: '7px', right: propertyRequired ? '76px' : '8px' }}>
                  <Badge backgroundColor="#187e9c">Default: {defaultValue.toString()}</Badge>
                </span>
              )}
              {propertyRequired && (
                <span css={{ top: '7px', right: '8px' }}>
                  <Badge backgroundColor="#f2720c">Required</Badge>
                </span>
              )}
            </div>
            <div
              css={{
                width: '40px',
                minWidth: '40px',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '8px',
                [onMaxW500]: {
                  width: '34px',
                  minWidth: '34px'
                },
                'svg path': {
                  fill: colors.fontColorPrimary
                }
              }}
            >
              {!open ? (
                <BiChevronDown size={20} color={colors.fontColorPrimary} />
              ) : (
                <BiChevronUp size={20} color={colors.fontColorPrimary} />
              )}
            </div>
          </div>
        </div>
        {open && (
          <ExpandableView
            propertyTypeInfo={propertyTypeInfo}
            longDescription={longDescription}
            shortDescription={shortDescription}
            rewriteLinksForReferencedCompositeTypes={rewriteLinksForReferencedCompositeTypes}
          />
        )}
      </div>
    </div>
  );
}

const getTypenameFromPropertiesInterface = (defName: string) => {
  return defName.endsWith('Props') ? defName.slice(0, -'Props'.length) : defName;
};

function PropertiesHeader({
  definitionName,
  referencedInDefinitions,
  rewriteLinksForReferencedCompositeTypes
}: {
  referencedInDefinitions: any[];
  definitionName: string;
  rewriteLinksForReferencedCompositeTypes?: { [typeName: string]: string };
}) {
  return (
    <div
      css={{
        display: 'flex',
        padding: '4px 12px',
        background: colors.darkerBackground,
        color: colors.primary,
        fontSize: '14px',
        lineHeight: '2em',
        borderRadius: '6px 6px 0px 0px',
        border,
        borderBottom: 'none'
      }}
    >
      <div css={{ textAlign: 'left', flex: 1, ...typographyCss }}>
        <span
          css={{
            fontWeight: 'bolder',
            color: colors.fontColorPrimary,
            fontSize: '14px',
            letterSpacing: 0.4
          }}
        >
          {getTypenameFromPropertiesInterface(definitionName)}
        </span>
        &nbsp;&nbsp;
        <span css={{ color: colors.fontColorPrimary, fontWeight: 'normal' }}>API reference</span>
      </div>
      {referencedInDefinitions.length > 0 && (
        <div
          css={{
            ...typographyCss,
            textAlign: 'right',
            flex: 1,
            [onMaxW650]: {
              display: 'none'
            }
          }}
        >
          <span css={{ color: colors.fontColorPrimary, marginRight: '3px' }}>Parent:</span>
          <PropertyTypeBadgeLine
            badges={referencedInDefinitions.map((defName) => ({
              typeName: getTypenameFromPropertiesInterface(defName),
              isCompositeType: true
            }))}
            rewriteLinksForReferencedCompositeTypes={rewriteLinksForReferencedCompositeTypes}
          />
        </div>
      )}
    </div>
  );
}

function PropertiesTable({
  definitionName,
  searchForReferencesInDefinition,
  rewriteLinksForReferencedCompositeTypes
}: {
  definitionName: string;
  searchForReferencesInDefinition?: string;
  rewriteLinksForReferencedCompositeTypes?: { [typeName: string]: string };
}) {
  const { definitions } = configSchema;
  const definition = definitions[definitionName];
  const referencedInDefinitions = getSchemaReferer({
    definitionName,
    definitions: definitions as any,
    searchForReferencesInDefinition
  });

  // const [propertyToNest, nestedPropertyName] = nestedTable.split('.');
  const properties: { propertyName: string; propertySpec: any; required: boolean }[] = [];
  if (!definition) {
    if (process.env.IS_DEV) {
      console.error(`Definition of ${definitionName} not found in reference of ${searchForReferencesInDefinition}.`);
    }
    return null;
  }

  for (const [propertyName, propertySpec] of Object.entries(definition.properties)) {
    if (!(propertyName === 'properties')) {
      properties.push({
        propertyName,
        propertySpec,
        required: getIsRequired({ definition, propName: propertyName })
      });
    } else {
      const nestedTypeName = getTypeNameFromReference({ reference: (propertySpec as any).$ref });
      const nestedDefinition = definitions[nestedTypeName];
      Object.entries(nestedDefinition.properties).forEach(([nestedPropertyName, nestedPropertySpec]) => {
        properties.push({
          propertyName: `${propertyName}.${nestedPropertyName}`,
          propertySpec: nestedPropertySpec,
          required: getIsRequired({ definition: nestedDefinition, propName: nestedPropertyName })
        });
      });
    }
  }
  const sortedProperties = sortBy(properties, (prop) => prop.required !== true).map((prop) => {
    return {
      ...prop,
      propertyTypeInfo: getPropertyTypeInfo({
        propertySpec: prop.propertySpec,
        propertyName: prop.propertyName,
        definitions: definitions as unknown as { [defName: string]: SchemaNode }
      })
    };
  });

  return (
    <div id={buildApiReferenceTableId({ definitionName })}>
      <div
        css={{
          background: colors.backgroundColor,
          marginBottom: '30px',
          marginTop: '30px',
          ...box
        }}
      >
        <PropertiesHeader
          definitionName={definitionName}
          referencedInDefinitions={referencedInDefinitions}
          rewriteLinksForReferencedCompositeTypes={rewriteLinksForReferencedCompositeTypes}
        />
        <div>
          {sortedProperties.map(({ propertyName, propertySpec, required, propertyTypeInfo }, idx) => {
            return (
              <PropertyInfo
                key={propertyName}
                propertyName={propertyName}
                idx={idx}
                isLast={idx === sortedProperties.length - 1}
                propertyRequired={required}
                longDescription={propertySpec._MdxDesc?.ld}
                shortDescription={propertySpec._MdxDesc?.sd}
                propertyTypeInfo={propertyTypeInfo}
                defaultValue={propertySpec.default || propertySpec.default?.[0]?.text}
                rewriteLinksForReferencedCompositeTypes={rewriteLinksForReferencedCompositeTypes}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PropertiesTable;
