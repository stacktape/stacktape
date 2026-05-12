/**
 * <ApiReference /> — schema-driven reference for Stacktape resource props.
 *
 * The UI intentionally follows the shape of mature API references:
 * - dense property rows for scanning
 * - one stable root reference
 * - inline expansion for details and polymorphic branches
 * - one bounded related-type panel instead of accumulating sections
 */
import { kebabCase } from 'change-case';
import { Fragment, useState, type ReactNode } from 'react';
import { BiChevronDown, BiChevronRight, BiSearch } from 'react-icons/bi';
import { apiReferenceData, type ApiReferenceGeneratedDefinition } from '@/generated/api-reference-data';
import { typographyCss } from '@/styles/global';
import { onMaxW500 } from '@/styles/responsive';
import type { NormalizedProperty, NormalizedTypeInfo, NormalizedUnionBranch } from '@/utils/api-reference-extractor';
import { box, colors } from '../../styles/variables';
import { CodeBlockNew } from './CodeBlockNew';

const apiReferenceDefinitions = apiReferenceData as Record<string, ApiReferenceGeneratedDefinition>;

const sectionAnchorId = (definitionName: string) => `api-ref_${kebabCase(definitionName)}`;
const propertyAnchorId = (definitionName: string, propertyPath: string) =>
  `api-ref_${kebabCase(definitionName)}_${kebabCase(propertyPath)}`;

type ViewMode = 'reference' | 'typescript';
type PropertyFilter = 'all' | 'required' | 'optional';

const mutedText = 'rgba(255, 255, 255, 0.58)';
const dimText = 'rgba(255, 255, 255, 0.42)';
const surface = 'rgba(16, 18, 18, 0.72)';
const surfaceSoft = 'rgba(255, 255, 255, 0.025)';
const surfaceHover = 'rgba(137, 220, 235, 0.055)';
const subtleBorder = 'rgba(255, 255, 255, 0.075)';
const strongerBorder = 'rgba(255, 255, 255, 0.12)';
const accentBorder = 'rgba(137, 220, 235, 0.34)';
const accentBg = 'rgba(137, 220, 235, 0.1)';
const accentText = '#89dceb';

const stripHtml = (value = '') =>
  value
    .replace(/<[^>]*>/g, '')
    .replaceAll('--stp-required--', '')
    .trim();

const getTypeSummary = (typeInfo: NormalizedTypeInfo): string => {
  if (typeInfo.kind === 'array') return `${getTypeSummary(typeInfo.itemType)}[]`;
  if (typeInfo.kind === 'reference') return typeInfo.typeName;
  if (typeInfo.kind === 'union') return typeInfo.branches.map((branch) => branch.label).join(' | ');
  if (typeInfo.kind === 'primitive') {
    if (typeInfo.constValue !== undefined) return String(typeInfo.constValue);
    if (typeInfo.enumValues?.length) return typeInfo.enumValues.map(String).join(' | ');
    return typeInfo.types.join(' | ');
  }
  return 'any';
};

const getApiReferenceDefinition = (definitionName: string) => apiReferenceDefinitions[definitionName] || null;

function InlinePill({
  children,
  tone = 'neutral',
  title
}: {
  children: ReactNode;
  tone?: 'neutral' | 'required' | 'accent' | 'muted';
  title?: string;
}) {
  const styles = {
    neutral: {
      color: 'rgba(255,255,255,0.74)',
      background: 'rgba(255,255,255,0.06)',
      borderColor: 'rgba(255,255,255,0.09)'
    },
    required: {
      color: '#ffd5a1',
      background: 'rgba(237, 139, 0, 0.13)',
      borderColor: 'rgba(237, 139, 0, 0.36)'
    },
    accent: {
      color: accentText,
      background: accentBg,
      borderColor: accentBorder
    },
    muted: {
      color: dimText,
      background: 'rgba(255,255,255,0.035)',
      borderColor: 'rgba(255,255,255,0.06)'
    }
  }[tone];

  return (
    <span
      title={title}
      css={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '21px',
        padding: '2px 7px',
        border: `1px solid ${styles.borderColor}`,
        borderRadius: '5px',
        background: styles.background,
        color: styles.color,
        fontSize: '11.5px',
        fontWeight: 650,
        lineHeight: 1.25,
        whiteSpace: 'nowrap',
        ...typographyCss
      }}
    >
      {children}
    </span>
  );
}

function TypeToken({
  children,
  clickable,
  onClick
}: {
  children: ReactNode;
  clickable?: boolean;
  onClick?: () => void;
}) {
  if (clickable) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
        css={{
          border: `1px solid ${accentBorder}`,
          borderRadius: '5px',
          background: accentBg,
          color: accentText,
          padding: '2px 7px',
          fontSize: '12px',
          lineHeight: 1.35,
          fontFamily: 'monospace',
          cursor: 'pointer',
          ':hover': { borderColor: 'rgba(137,220,235,0.7)', background: 'rgba(137,220,235,0.15)' }
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <code
      css={{
        display: 'inline-flex',
        border: `1px solid ${subtleBorder}`,
        borderRadius: '5px',
        background: 'rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.78)',
        padding: '2px 7px',
        fontSize: '12px',
        lineHeight: 1.35,
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </code>
  );
}

function TypeInfoLine({
  typeInfo,
  onCompositeClick
}: {
  typeInfo: NormalizedTypeInfo;
  onCompositeClick: (typeName: string) => void;
}) {
  if (typeInfo.kind === 'array') {
    return (
      <span css={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <TypeToken>array</TypeToken>
        <span css={{ color: dimText, fontSize: '12px' }}>of</span>
        <TypeInfoLine typeInfo={typeInfo.itemType} onCompositeClick={onCompositeClick} />
      </span>
    );
  }
  if (typeInfo.kind === 'reference') {
    return (
      <TypeToken clickable onClick={() => onCompositeClick(typeInfo.typeName)}>
        {typeInfo.typeName}
      </TypeToken>
    );
  }
  if (typeInfo.kind === 'union') {
    return (
      <span css={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
        {typeInfo.branches.map((branch, i) => (
          <Fragment key={`${branch.label}-${i}`}>
            {i > 0 && <span css={{ color: dimText, fontSize: '12px' }}>or</span>}
            <TypeToken
              clickable={Boolean(branch.typeName) && branch.properties.length === 0}
              onClick={() => branch.typeName && onCompositeClick(branch.typeName)}
            >
              {branch.label}
            </TypeToken>
          </Fragment>
        ))}
      </span>
    );
  }
  if (typeInfo.kind === 'primitive') {
    if (typeInfo.constValue !== undefined) return <TypeToken>{JSON.stringify(typeInfo.constValue)}</TypeToken>;
    if (typeInfo.enumValues?.length) {
      return (
        <span css={{ display: 'inline-flex', gap: '5px', flexWrap: 'wrap' }}>
          {typeInfo.enumValues.slice(0, 8).map((value) => (
            <TypeToken key={String(value)}>{String(value)}</TypeToken>
          ))}
          {typeInfo.enumValues.length > 8 && <InlinePill tone="muted">+{typeInfo.enumValues.length - 8}</InlinePill>}
        </span>
      );
    }
    return (
      <span css={{ display: 'inline-flex', gap: '5px', flexWrap: 'wrap' }}>
        {typeInfo.types.map((type) => (
          <TypeToken key={type}>{type === 'integer' ? 'number' : type}</TypeToken>
        ))}
      </span>
    );
  }
  return <TypeToken>unknown</TypeToken>;
}

function ViewModeTabs({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div
      css={{
        display: 'inline-flex',
        gap: '3px',
        padding: '3px',
        border: `1px solid ${subtleBorder}`,
        borderRadius: '7px',
        background: 'rgba(255,255,255,0.03)'
      }}
    >
      {(['reference', 'typescript'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          css={{
            border: 'none',
            borderRadius: '5px',
            background: mode === m ? colors.primary : 'transparent',
            color: mode === m ? '#101010' : mutedText,
            padding: '6px 11px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            ...typographyCss
          }}
        >
          {m === 'reference' ? 'Reference' : 'TypeScript'}
        </button>
      ))}
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      css={{
        border: `1px solid ${active ? accentBorder : subtleBorder}`,
        borderRadius: '6px',
        background: active ? accentBg : 'transparent',
        color: active ? colors.fontColorPrimary : mutedText,
        padding: '6px 10px',
        fontSize: '12.5px',
        fontWeight: 700,
        cursor: 'pointer',
        ...typographyCss
      }}
    >
      {children}
    </button>
  );
}

function ReferenceHeader({
  definition,
  mode,
  onModeChange,
  searchQuery,
  onSearchQueryChange,
  filter,
  onFilterChange
}: {
  definition: ApiReferenceGeneratedDefinition;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filter: PropertyFilter;
  onFilterChange: (filter: PropertyFilter) => void;
}) {
  const requiredCount = definition.stats.requiredCount;
  const optionalCount = definition.stats.optionalCount;

  return (
    <div
      css={{
        padding: '18px',
        borderBottom: `1px solid ${subtleBorder}`,
        background:
          'linear-gradient(180deg, rgba(137,220,235,0.07), rgba(137,220,235,0.018) 70%, rgba(255,255,255,0.01))'
      }}
    >
      <div
        css={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'flex-start'
        }}
      >
        <div css={{ minWidth: 0 }}>
          <div
            css={{
              display: 'flex',
              gap: '9px',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '7px'
            }}
          >
            <span css={{ color: colors.fontColorPrimary, fontSize: '17px', fontWeight: 800, ...typographyCss }}>
              API reference
            </span>
            <code
              css={{
                color: accentText,
                background: accentBg,
                border: `1px solid ${accentBorder}`,
                borderRadius: '5px',
                padding: '3px 7px',
                fontSize: '12.5px'
              }}
            >
              {definition.definitionName}
            </code>
          </div>
          <div css={{ color: mutedText, fontSize: '13px', lineHeight: 1.55, ...typographyCss }}>
            {definition.properties.length} properties
            <span css={{ color: dimText }}> / </span>
            {requiredCount} required
            <span css={{ color: dimText }}> / </span>
            {optionalCount} optional
          </div>
        </div>
        <ViewModeTabs mode={mode} onChange={onModeChange} />
      </div>

      {mode === 'reference' && (
        <div
          css={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: '16px'
          }}
        >
          <div css={{ position: 'relative', flex: '1 1 260px', maxWidth: '420px' }}>
            <BiSearch
              size={17}
              color={mutedText}
              css={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search properties"
              css={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                border: `1px solid ${subtleBorder}`,
                borderRadius: '7px',
                background: 'rgba(0,0,0,0.2)',
                color: colors.fontColorPrimary,
                outline: 'none',
                fontSize: '13.5px',
                ...typographyCss,
                ':focus': {
                  borderColor: accentBorder,
                  boxShadow: '0 0 0 3px rgba(137,220,235,0.08)'
                }
              }}
            />
          </div>
          <FilterButton active={filter === 'all'} onClick={() => onFilterChange('all')}>
            All
          </FilterButton>
          <FilterButton active={filter === 'required'} onClick={() => onFilterChange('required')}>
            Required
          </FilterButton>
          <FilterButton active={filter === 'optional'} onClick={() => onFilterChange('optional')}>
            Optional
          </FilterButton>
        </div>
      )}
    </div>
  );
}

function UnionSelector({
  branches,
  selectedIndex,
  onSelect,
  isDiscriminated
}: {
  branches: NormalizedUnionBranch[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isDiscriminated: boolean;
}) {
  return (
    <div css={{ display: 'grid', gap: '8px' }}>
      <div css={{ color: mutedText, fontSize: '12.5px', fontWeight: 700, ...typographyCss }}>
        {isDiscriminated ? 'Choose a type value' : 'Choose a shape'}
      </div>
      <div
        role="radiogroup"
        css={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '5px',
          padding: '4px',
          width: 'fit-content',
          border: `1px solid ${subtleBorder}`,
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.18)'
        }}
      >
        {branches.map((branch, index) => (
          <button
            key={`${branch.label}-${index}`}
            type="button"
            role="radio"
            aria-checked={selectedIndex === index}
            onClick={() => onSelect(index)}
            css={{
              border: 'none',
              borderRadius: '6px',
              background: selectedIndex === index ? colors.primary : 'transparent',
              color: selectedIndex === index ? '#101010' : mutedText,
              padding: '6px 10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 750,
              cursor: 'pointer'
            }}
          >
            {branch.label}
          </button>
        ))}
      </div>
      {branches[selectedIndex]?.shortDescription && (
        <div
          css={{ color: mutedText, fontSize: '13px', lineHeight: 1.55, maxWidth: '720px' }}
          dangerouslySetInnerHTML={{ __html: branches[selectedIndex].shortDescription || '' }}
        />
      )}
    </div>
  );
}

function PropertyRow({
  definitionName,
  property,
  path,
  depth = 0,
  defaultOpen = false,
  onCompositeClick
}: {
  definitionName: string;
  property: NormalizedProperty;
  path: string;
  depth?: number;
  defaultOpen?: boolean;
  onCompositeClick: (typeName: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [unionIndex, setUnionIndex] = useState(0);
  const anchorId = propertyAnchorId(definitionName, path);
  const description = stripHtml(property.shortDescription) || 'No description.';
  const unionInfo =
    property.typeInfo.kind === 'union'
      ? property.typeInfo
      : property.typeInfo.kind === 'array' && property.typeInfo.itemType.kind === 'union'
        ? property.typeInfo.itemType
        : null;
  const selectedBranch = unionInfo?.branches[unionIndex];
  const hasDetails = Boolean(property.longDescription || property.defaultValue !== undefined || unionInfo);

  return (
    <div
      id={anchorId}
      css={{
        borderTop: `1px solid ${subtleBorder}`,
        background: depth > 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
      }}
    >
      <div
        role={hasDetails ? 'button' : undefined}
        tabIndex={hasDetails ? 0 : undefined}
        aria-expanded={hasDetails ? open : undefined}
        onClick={() => {
          if (hasDetails) setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (!hasDetails) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
        css={{
          width: '100%',
          background: 'transparent',
          color: colors.fontColorPrimary,
          cursor: hasDetails ? 'pointer' : 'default',
          textAlign: 'left',
          display: 'grid',
          gridTemplateColumns: 'minmax(190px, 0.9fr) minmax(260px, 1.2fr) minmax(190px, 0.8fr) 22px',
          gap: '16px',
          alignItems: 'start',
          padding: depth > 0 ? '11px 14px' : '13px 16px',
          transition: 'background 140ms ease',
          ':hover': { background: surfaceHover },
          [onMaxW500]: {
            gridTemplateColumns: '1fr 22px',
            gap: '8px'
          }
        }}
      >
        <div css={{ minWidth: 0 }}>
          <code
            css={{
              color: colors.fontColorPrimary,
              fontSize: depth > 0 ? '13px' : '13.5px',
              fontWeight: 800,
              overflowWrap: 'anywhere'
            }}
          >
            {property.name}
          </code>
          <div css={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
            {property.required ? (
              <InlinePill tone="required">required</InlinePill>
            ) : (
              <InlinePill tone="muted">optional</InlinePill>
            )}
            {property.inheritedFrom && <InlinePill tone="muted">from {property.inheritedFrom}</InlinePill>}
            {property.defaultValue !== undefined && (
              <InlinePill tone="accent">default {property.defaultValue}</InlinePill>
            )}
          </div>
        </div>
        <div
          css={{
            color: property.shortDescription ? 'rgba(255,255,255,0.82)' : mutedText,
            fontSize: '13.5px',
            lineHeight: 1.55,
            minWidth: 0,
            ...typographyCss,
            [onMaxW500]: { gridColumn: '1 / -1', gridRow: 2 }
          }}
        >
          {description}
        </div>
        <div
          css={{
            minWidth: 0,
            display: 'flex',
            alignItems: 'flex-start',
            [onMaxW500]: { gridColumn: '1 / -1', gridRow: 3 }
          }}
        >
          <TypeInfoLine typeInfo={property.typeInfo} onCompositeClick={onCompositeClick} />
        </div>
        <div css={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1px' }}>
          {hasDetails ? (
            open ? (
              <BiChevronDown size={20} color={mutedText} />
            ) : (
              <BiChevronRight size={20} color={mutedText} />
            )
          ) : null}
        </div>
      </div>

      {open && hasDetails && (
        <div
          css={{
            margin: '0 16px 16px',
            padding: '14px',
            border: `1px solid ${subtleBorder}`,
            borderRadius: '7px',
            background: 'rgba(0,0,0,0.16)',
            color: 'rgba(255,255,255,0.82)'
          }}
        >
          {property.longDescription && (
            <div
              css={{
                fontSize: '13px',
                lineHeight: 1.65,
                p: { margin: '6px 0' },
                ul: { margin: '6px 0', paddingLeft: '20px' },
                li: { margin: '3px 0' }
              }}
              dangerouslySetInnerHTML={{ __html: property.longDescription.replaceAll('--stp-required--', '') }}
            />
          )}

          <div
            css={{
              display: 'grid',
              gridTemplateColumns: '90px minmax(0, 1fr)',
              gap: '8px 12px',
              marginTop: property.longDescription ? '12px' : 0,
              fontSize: '13px',
              [onMaxW500]: { gridTemplateColumns: '1fr' }
            }}
          >
            <span css={{ color: mutedText, fontWeight: 750 }}>Type</span>
            <div>
              <TypeInfoLine typeInfo={property.typeInfo} onCompositeClick={onCompositeClick} />
            </div>
            {property.defaultValue !== undefined && (
              <Fragment>
                <span css={{ color: mutedText, fontWeight: 750 }}>Default</span>
                <code css={{ color: colors.fontColorPrimary }}>{property.defaultValue}</code>
              </Fragment>
            )}
          </div>

          {unionInfo && selectedBranch && (
            <div
              css={{
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: `1px solid ${subtleBorder}`
              }}
            >
              <UnionSelector
                branches={unionInfo.branches}
                selectedIndex={unionIndex}
                onSelect={setUnionIndex}
                isDiscriminated={Boolean(unionInfo.discriminator)}
              />
              <div css={{ marginTop: '12px' }}>
                {selectedBranch.properties.length > 0 ? (
                  <PropertyList
                    definitionName={`${definitionName}.${path}.${selectedBranch.label}`}
                    properties={selectedBranch.properties}
                    depth={depth + 1}
                    searchQuery=""
                    filter="all"
                    onCompositeClick={onCompositeClick}
                  />
                ) : (
                  <div css={{ color: mutedText, fontSize: '13px' }}>This choice has no additional properties.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function filterProperties(properties: NormalizedProperty[], searchQuery: string, filter: PropertyFilter) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return properties.filter((property) => {
    if (filter === 'required' && !property.required) return false;
    if (filter === 'optional' && property.required) return false;
    if (!normalizedQuery) return true;
    return [
      property.name,
      stripHtml(property.shortDescription),
      stripHtml(property.longDescription),
      getTypeSummary(property.typeInfo),
      property.inheritedFrom || ''
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function PropertyList({
  definitionName,
  properties,
  depth = 0,
  searchQuery,
  filter,
  onCompositeClick
}: {
  definitionName: string;
  properties: NormalizedProperty[];
  depth?: number;
  searchQuery: string;
  filter: PropertyFilter;
  onCompositeClick: (typeName: string) => void;
}) {
  const visibleProperties = filterProperties(properties, searchQuery, filter);

  if (visibleProperties.length === 0) {
    return (
      <div css={{ padding: depth > 0 ? '14px' : '22px 18px', color: mutedText, fontSize: '13.5px' }}>
        {properties.length === 0 ? 'No properties.' : 'No matching properties.'}
      </div>
    );
  }

  return (
    <div
      css={{
        overflow: 'hidden',
        border: depth > 0 ? `1px solid ${subtleBorder}` : 'none',
        borderRadius: depth > 0 ? '7px' : 0
      }}
    >
      {depth === 0 && (
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: 'minmax(190px, 0.9fr) minmax(260px, 1.2fr) minmax(190px, 0.8fr) 22px',
            gap: '16px',
            padding: '9px 16px',
            color: dimText,
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0,
            background: 'rgba(0,0,0,0.14)',
            [onMaxW500]: { display: 'none' }
          }}
        >
          <span>Property</span>
          <span>Description</span>
          <span>Type</span>
          <span />
        </div>
      )}
      {visibleProperties.map((property) => (
        <PropertyRow
          key={property.name}
          definitionName={definitionName}
          property={property}
          path={property.name}
          depth={depth}
          onCompositeClick={onCompositeClick}
        />
      ))}
    </div>
  );
}

function RelatedTypePanel({
  definition,
  onClose,
  onCompositeClick
}: {
  definition: ApiReferenceGeneratedDefinition;
  onClose: () => void;
  onCompositeClick: (typeName: string) => void;
}) {
  return (
    <div
      id={sectionAnchorId(definition.definitionName)}
      css={{
        margin: '16px 18px 18px',
        border: `1px solid ${accentBorder}`,
        borderRadius: '8px',
        background: 'rgba(137,220,235,0.045)',
        overflow: 'hidden'
      }}
    >
      <div
        css={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: `1px solid ${subtleBorder}`,
          flexWrap: 'wrap'
        }}
      >
        <div css={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <InlinePill tone="accent">related type</InlinePill>
          <code css={{ color: colors.fontColorPrimary, fontSize: '13px', fontWeight: 800 }}>
            {definition.definitionName}
          </code>
          <span css={{ color: mutedText, fontSize: '12.5px' }}>{definition.properties.length} properties</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          css={{
            border: `1px solid ${subtleBorder}`,
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.16)',
            color: mutedText,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: '12.5px',
            fontWeight: 700,
            ...typographyCss,
            ':hover': { color: colors.fontColorPrimary, borderColor: strongerBorder }
          }}
        >
          Close
        </button>
      </div>
      <PropertyList
        definitionName={definition.definitionName}
        properties={definition.properties}
        searchQuery=""
        filter="all"
        onCompositeClick={onCompositeClick}
      />
    </div>
  );
}

function TypeScriptView({ definition }: { definition: ApiReferenceGeneratedDefinition }) {
  return (
    <div css={{ padding: '18px' }}>
      <div
        css={{
          padding: '14px 14px 0',
          color: mutedText,
          fontSize: '13px',
          lineHeight: 1.55,
          ...typographyCss
        }}
      >
        Compact declaration generated from the same schema. Wide unions are named below the main shape.
      </div>
      <CodeBlockNew
        intellisense
        tabs={[
          {
            label: 'TypeScript',
            lang: 'ts',
            code: definition.typeDeclaration
          }
        ]}
      />
    </div>
  );
}

export function ApiReference({ definitionName }: { definitionName: string }) {
  const [mode, setMode] = useState<ViewMode>('reference');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<PropertyFilter>('all');

  const rootDefinition = getApiReferenceDefinition(definitionName);
  const relatedDefinition = selectedType ? getApiReferenceDefinition(selectedType) : null;

  if (!rootDefinition) {
    return (
      <div
        css={{
          padding: '14px',
          color: colors.fontColorPrimary,
          background: colors.backgroundColor,
          ...box,
          marginTop: '24px'
        }}
      >
        Unknown definition <code>{definitionName}</code>.
      </div>
    );
  }

  const handleCompositeClick = (typeName: string) => {
    setSelectedType(typeName);
    setTimeout(() => {
      const target = document.getElementById(sectionAnchorId(typeName));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  return (
    <section
      id={sectionAnchorId(rootDefinition.definitionName)}
      css={{
        marginTop: '24px',
        marginBottom: '28px',
        border: `1px solid ${subtleBorder}`,
        borderRadius: '8px',
        background: surface,
        boxShadow: '0 14px 42px rgba(0,0,0,0.22)',
        overflow: 'hidden'
      }}
    >
      <ReferenceHeader
        definition={rootDefinition}
        mode={mode}
        onModeChange={setMode}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
      />
      {mode === 'reference' ? (
        <Fragment>
          <div css={{ background: surfaceSoft }}>
            <PropertyList
              definitionName={rootDefinition.definitionName}
              properties={rootDefinition.properties}
              searchQuery={searchQuery}
              filter={filter}
              onCompositeClick={handleCompositeClick}
            />
          </div>
          {relatedDefinition && (
            <RelatedTypePanel
              definition={relatedDefinition}
              onClose={() => setSelectedType(null)}
              onCompositeClick={handleCompositeClick}
            />
          )}
        </Fragment>
      ) : (
        <TypeScriptView definition={rootDefinition} />
      )}
    </section>
  );
}

export default ApiReference;
