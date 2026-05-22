import { kebabCase } from 'change-case';
import sortBy from 'lodash/sortBy';
import { Fragment, useState } from 'react';
import { ChevronDown } from 'react-feather';
import { onMaxW500, onMaxW650 } from '@/styles/responsive';
import { capitalizeFirstLetter } from '@/utils/helpers';
import {
  getIsRequired,
  getPropertyTypeInfo,
  getSchemaReferer,
  getTypeNameFromReference
} from '@/utils/schema-extractor';
import configSchema from '../../../../@generated/schemas/config-schema.json';
import { colors, fontFamily, fontFamilyMono } from '../../styles/variables';
import { Badge } from './Badge';

const buildApiReferenceTableId = ({ definitionName }: { definitionName: string }) => {
  return `api-ref_${kebabCase(definitionName)}`;
};

// Same duration as the sidebar nav collapse so the two animations feel consistent.
const COLLAPSE_DURATION_MS = 220;

const ROW_HOVER_BG = 'rgba(255, 255, 255, 0.04)';
const ROW_DIVIDER = '1px solid rgba(255, 255, 255, 0.06)';

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
          <Fragment key={badgeText}>
            {isCompositeType ? (
              <a
                onClick={(e) => e.stopPropagation()}
                css={{ wordBreak: 'break-all' }}
                href={apiReferenceTableId || undefined}
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
            {!isLast && <span css={{ color: colors.fontColorTernary, margin: '0 4px' }}>or</span>}
          </Fragment>
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
      if (typeof val1 === 'number') return Number(val1) - Number(val2);
      return val1;
    });

  return (
    <div
      css={{
        padding: '4px 18px 18px 18px',
        color: colors.fontColorPrimary,
        fontSize: '14px',
        lineHeight: 1.6,
        // Inline `<code>` styling inside the long description uses the global pill style — no
        // per-row override needed.
        '> *:first-of-type': { marginTop: 0 }
      }}
    >
      <div
        css={{ fontSize: '14.5px', fontWeight: 600, color: colors.fontColorPrimary, marginBottom: '10px' }}
        dangerouslySetInnerHTML={{ __html: shortDesc }}
      />
      <div
        css={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          marginTop: '10px',
          color: colors.fontColorPrimary,
          fontSize: '13.5px',
          lineHeight: 1.7
        }}
      >
        <span css={{ color: colors.fontColorTernary, marginRight: '2px' }}>Type</span>
        {propertyTypeInfo.isArray && (
          <span
            css={{
              whiteSpace: 'nowrap',
              color: colors.fontColorPrimary,
              [onMaxW500]: { whiteSpace: 'normal' }
            }}
          >
            Array of&nbsp;
          </span>
        )}
        <PropertyTypeBadgeLine
          badges={allowedPropertyTypes}
          rewriteLinksForReferencedCompositeTypes={rewriteLinksForReferencedCompositeTypes}
        />
      </div>
      {shouldShowPossibleValuesList && (
        <div
          css={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            fontSize: '13.5px',
            lineHeight: 1.7
          }}
        >
          <span css={{ color: colors.fontColorTernary, marginRight: '2px' }}>Possible values</span>
          {possibleValues.map((allowedType) => (
            <Badge key={allowedType} backgroundColor="#5a5a5a">
              {allowedType}
            </Badge>
          ))}
        </div>
      )}
      {longDescription && (
        <div
          css={{
            marginTop: '14px',
            color: colors.fontColorPrimary,
            p: { fontSize: '14px !important', lineHeight: '1.7 !important', margin: '8px 0 !important' },
            li: { fontSize: '14px !important', lineHeight: '1.6 !important' },
            a: { fontWeight: 500 },
            pre: {
              backgroundColor: colors.darkerBackground,
              overflowX: 'auto',
              overflowY: 'hidden'
            }
          }}
          dangerouslySetInnerHTML={{ __html: longDescription.replaceAll('--stp-required--', '') }}
        />
      )}
    </div>
  );
}

export function PropertyInfo({
  propertyName,
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

  return (
    <div
      css={{
        borderBottom: isLast ? 'none' : ROW_DIVIDER,
        transition: `background 140ms ease`,
        '&:hover': { background: ROW_HOVER_BG }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Collapse row' : 'Expand row'}
        css={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          padding: '10px 16px',
          boxSizing: 'border-box'
        }}
      >
        <code
          css={{
            // Override the global `code` size — at default 0.875em the property name reads
            // smaller than the surrounding row, which makes the list feel cramped.
            fontSize: '13.5px',
            fontFamily: fontFamilyMono,
            color: colors.fontColorPrimary,
            background: 'rgba(54, 190, 190, 0.10)',
            padding: '2px 7px',
            borderRadius: '4px',
            wordBreak: 'break-all',
            userSelect: 'text'
          }}
          onClick={(e) => e.stopPropagation() /* let users select the prop name without toggling */}
        >
          {propertyName}
        </code>
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
            flexShrink: 0
          }}
        >
          {defaultValue !== undefined && <Badge backgroundColor="#1f6f88">Default: {defaultValue.toString()}</Badge>}
          {propertyRequired && <Badge backgroundColor="#c66514">Required</Badge>}
          <ChevronDown
            size={16}
            css={{
              color: colors.fontColorTernary,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform ${COLLAPSE_DURATION_MS}ms ease`,
              flexShrink: 0
            }}
          />
        </div>
      </button>

      {/* Grid-template-rows trick: animates from 0fr → 1fr (and back), with the inner div
          clipping overflow so children visually collapse smoothly. Same pattern as the sidebar
          nav (see ContentTreeNode.tsx) so both feel consistent. Content stays mounted so the
          animation runs both ways. */}
      <div
        aria-hidden={!open}
        css={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: `grid-template-rows ${COLLAPSE_DURATION_MS}ms ease`
        }}
      >
        <div css={{ overflow: 'hidden', minHeight: 0 }}>
          <ExpandableView
            propertyTypeInfo={propertyTypeInfo}
            longDescription={longDescription}
            shortDescription={shortDescription}
            rewriteLinksForReferencedCompositeTypes={rewriteLinksForReferencedCompositeTypes}
          />
        </div>
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
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: ROW_DIVIDER,
        fontFamily
      }}
    >
      <div css={{ display: 'flex', alignItems: 'baseline', gap: '8px', flex: 1, minWidth: 0 }}>
        <span
          css={{
            fontSize: '15px',
            fontWeight: 600,
            color: colors.fontColorPrimary,
            letterSpacing: '0.2px'
          }}
        >
          {getTypenameFromPropertiesInterface(definitionName)}
        </span>
        <span css={{ fontSize: '12px', color: colors.fontColorTernary, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          API reference
        </span>
      </div>
      {referencedInDefinitions.length > 0 && (
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            color: colors.fontColorTernary,
            [onMaxW650]: { display: 'none' }
          }}
        >
          <span>Parent</span>
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
          margin: '30px 0',
          background: colors.elementBackground,
          borderRadius: '8px',
          boxShadow:
            '0 2px 8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          overflow: 'hidden'
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
