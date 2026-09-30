import type { ApiProperty, ApiTypeInfo } from '@/utils/api-reference-dto';
import { cliCommandReference } from 'virtual:stacktape/cli-command-reference';
import { renderDocsMarkdown } from '@/utils/docs-markdown';
import { PropertyDescription, PropertyHeading, tokens } from './api-reference/shared';

export type CliCommandArg = {
  name: string;
  required: boolean;
  description?: string;
  alias?: string;
  allowedValues?: string[];
  allowedTypes: string[];
};

// Map a CLI arg onto the same ApiProperty shape the resource API reference renders, so the
// CLI options reuse its exact visual atoms (PropertyHeading + TypeBadge + PropertyDescription) and
// stay on-brand.
const buildTypeInfo = (allowedTypes?: string[], allowedValues?: string[]): ApiTypeInfo => {
  const types = Array.isArray(allowedTypes) && allowedTypes.length > 0 ? allowedTypes : ['string'];
  return {
    kind: 'primitive',
    types: types.map((type) => (type === 'integer' ? 'number' : type)),
    enumValues: Array.isArray(allowedValues) && allowedValues.length > 0 ? allowedValues : undefined
  };
};

const toProperty = (arg: CliCommandArg): ApiProperty => {
  const [short = '', ...long] = (arg.description || '').split('---');
  return {
    name: `--${arg.name}${arg.alias ? ` (-${arg.alias})` : ''}`,
    required: arg.required,
    shortDescription: renderDocsMarkdown(short.trim().replace(/^#{1,6}\s+/, '')),
    longDescription: renderDocsMarkdown(long.join('---').trim()),
    typeInfo: buildTypeInfo(arg.allowedTypes, arg.allowedValues)
  };
};

export function CliCommandsApiReference({ command }: { command: string }) {
  const args = cliCommandReference[command];
  if (!args) throw new Error(`CLI reference command "${command}" was not found. Regenerate CLI artifacts.`);

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

      {args.length > 0 ? (
        args.map((arg, idx) => {
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
    </section>
  );
}
