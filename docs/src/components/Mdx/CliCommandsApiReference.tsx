import type { NormalizedProperty, NormalizedTypeInfo } from '@/utils/api-reference-extractor';
import { typographyCss } from '../../styles/global';
import { colors } from '../../styles/variables';
import { PropertyDescription, PropertyHeading, tokens } from './api-reference/shared';

export type CommandArg = {
  name: string;
  required: boolean;
  longDescription: string;
  shortDescription: string;
  alias?: string;
  allowedValues?: string[];
  allowedTypes: string[];
};

// Map a CLI arg onto the same NormalizedProperty shape the resource API reference renders, so the
// CLI options reuse its exact visual atoms (PropertyHeading + TypeBadge + PropertyDescription) and
// stay on-brand.
const buildTypeInfo = (allowedTypes?: string[], allowedValues?: string[]): NormalizedTypeInfo => {
  const types = Array.isArray(allowedTypes) && allowedTypes.length > 0 ? allowedTypes : ['string'];
  return {
    kind: 'primitive',
    types: types.map((type) => (type === 'integer' ? 'number' : type)),
    enumValues: Array.isArray(allowedValues) && allowedValues.length > 0 ? allowedValues : undefined
  };
};

const toProperty = (arg: CommandArg): NormalizedProperty => ({
  name: `--${arg.name}${arg.alias ? ` (-${arg.alias})` : ''}`,
  required: Boolean(arg.required),
  shortDescription: arg.shortDescription || '',
  longDescription: arg.longDescription || '',
  typeInfo: buildTypeInfo(arg.allowedTypes, arg.allowedValues)
});

export function CliCommandsApiReference({ command, sortedArgs = [] }: { command: string; sortedArgs?: CommandArg[] }) {
  // Defensive: a malformed sortedArgs prop (e.g. an array of strings instead of CommandArg objects,
  // which the docs generation pipeline has accidentally produced) would otherwise crash the
  // production build's prerender pass.
  const validArgs = sortedArgs.filter(
    (arg): arg is CommandArg => arg != null && typeof arg === 'object' && 'name' in arg
  );
  const hasMalformedArgs = sortedArgs.length !== validArgs.length;

  return (
    <section
      id={`api-ref-${command}`}
      css={{
        marginTop: '24px',
        marginBottom: '28px',
        borderRadius: '10px',
        background: tokens.surface,
        boxShadow: tokens.panelShadow,
        overflow: 'hidden'
      }}
    >
      <div
        css={{
          padding: '12px 16px',
          borderBottom: `1px solid ${tokens.subtleBorder}`,
          background: tokens.surfaceSunken,
          display: 'flex',
          alignItems: 'baseline',
          gap: '10px',
          flexWrap: 'wrap'
        }}
      >
        <code css={{ color: tokens.syntax.type, fontSize: '14px', fontWeight: 600, fontFamily: tokens.monoFamily }}>
          {command}
        </code>
        <span
          css={{
            ...typographyCss,
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: 1.2,
            color: tokens.dimText,
            textTransform: 'uppercase',
            letterSpacing: '0.6px'
          }}
        >
          CLI options
        </span>
      </div>

      {validArgs.length > 0 ? (
        validArgs.map((arg, idx) => {
          const property = toProperty(arg);
          return (
            <div
              key={arg.name}
              css={{
                padding: '14px 16px',
                ...(idx > 0 && { borderTop: `1px solid ${tokens.subtleBorder}` })
              }}
            >
              <PropertyHeading property={property} level={2} />
              <PropertyDescription property={property} />
            </div>
          );
        })
      ) : (
        <p css={{ ...typographyCss, padding: '14px 16px', fontSize: '13.5px', color: tokens.mutedText }}>
          No available options.
        </p>
      )}

      {hasMalformedArgs && (
        <p css={{ ...typographyCss, padding: '12px 16px', fontSize: '12.5px', lineHeight: 1.6, color: colors.error }}>
          Some options could not be displayed because the sortedArgs payload contained entries that were not in the
          expected CommandArg shape. Re-generate this page via the docs pipeline to refresh the reference data.
        </p>
      )}
    </section>
  );
}
