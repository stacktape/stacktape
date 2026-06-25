import type { NormalizedProperty, NormalizedTypeInfo } from '@/utils/api-reference-extractor';
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
      className="mt-[24px] mb-[28px] overflow-hidden rounded-[10px]"
      style={{ background: tokens.surface, boxShadow: tokens.panelShadow }}
    >
      <div
        className="flex flex-wrap items-baseline gap-[10px] border-b border-solid px-[16px] py-[12px]"
        style={{ borderBottomColor: tokens.subtleBorder, background: tokens.surfaceSunken }}
      >
        <code
          className="text-[14px] font-semibold"
          style={{ color: tokens.syntax.type, fontFamily: tokens.monoFamily }}
        >
          {command}
        </code>
        <span
          className="stp-typography text-[12px] font-medium uppercase leading-[1.2] tracking-[0.6px]"
          style={{ color: tokens.dimText }}
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
              className="px-[16px] py-[14px]"
              style={idx > 0 ? { borderTop: `1px solid ${tokens.subtleBorder}` } : undefined}
            >
              <PropertyHeading property={property} level={2} />
              <PropertyDescription property={property} />
            </div>
          );
        })
      ) : (
        <p className="stp-typography px-[16px] py-[14px] text-[13.5px]" style={{ color: tokens.mutedText }}>
          No available options.
        </p>
      )}

      {hasMalformedArgs && (
        <p className="stp-typography px-[16px] py-[12px] text-[12.5px] leading-[1.6] text-error">
          Some options could not be displayed because the sortedArgs payload contained entries that were not in the
          expected CommandArg shape. Re-generate this page via the docs pipeline to refresh the reference data.
        </p>
      )}
    </section>
  );
}
