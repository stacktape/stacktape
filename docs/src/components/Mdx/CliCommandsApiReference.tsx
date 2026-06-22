import { colors } from '../../styles/variables';
import { typographyCss } from '../../styles/global';
import { PropertyInfo } from './PropertiesTable';

export type CommandArg = {
  name: string;
  required: boolean;
  longDescription: string;
  shortDescription: string;
  alias?: string;
  allowedValues?: string[];
  allowedTypes: string[];
};

const ROW_DIVIDER = '1px solid rgba(255, 255, 255, 0.06)';

export function CliCommandsApiReference({ command, sortedArgs = [] }: { command: string; sortedArgs?: CommandArg[] }) {
  const validArgs = sortedArgs.filter(
    (arg): arg is CommandArg => arg != null && typeof arg === 'object' && 'name' in arg
  );
  const hasMalformedArgs = sortedArgs.length !== validArgs.length;

  return (
    <div
      id={`api-ref-${command}`}
      css={{
        margin: '24px 0',
        background: colors.elementBackground,
        borderRadius: '8px',
        boxShadow:
          '0 2px 8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        overflow: 'hidden'
      }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          padding: '12px 16px',
          borderBottom: ROW_DIVIDER
        }}
      >
        <span
          css={{
            ...typographyCss,
            fontSize: '15px',
            fontWeight: 600,
            lineHeight: 1.2,
            color: colors.fontColorPrimary,
            letterSpacing: '0.2px'
          }}
        >
          Options
        </span>
        <span
          css={{
            ...typographyCss,
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: 1.2,
            color: colors.fontColorTernary,
            textTransform: 'uppercase',
            letterSpacing: '0.6px'
          }}
        >
          CLI reference
        </span>
      </div>

      <div>
        {validArgs.length > 0 ? (
          // Defensive: a malformed sortedArgs prop (e.g. an array of strings instead of
          // CommandArg objects, which the docs generation pipeline has accidentally produced)
          // would otherwise crash the production build's prerender pass.
          validArgs.map((arg, idx) => {
            const { name, required, shortDescription, longDescription, alias, allowedValues, allowedTypes } = arg;
            const safeAllowedTypes = Array.isArray(allowedTypes) && allowedTypes.length > 0 ? allowedTypes : ['string'];
            return (
              <PropertyInfo
                key={name}
                propertyName={`--${name}${alias ? ` (-${alias})` : ''}`}
                idx={idx}
                isLast={validArgs.length - 1 === idx}
                propertyRequired={required}
                shortDescription={shortDescription}
                longDescription={longDescription}
                propertyTypeInfo={{
                  allowedTypes: [{ typeName: safeAllowedTypes[0], enumeratedValues: allowedValues }],
                  isArray: false
                }}
              />
            );
          })
        ) : (
          <p css={{ ...typographyCss, padding: '14px 16px', fontSize: '13.5px', color: colors.fontColorTernary }}>
            No available options.
          </p>
        )}
        {hasMalformedArgs && (
          <p css={{ ...typographyCss, padding: '12px 16px', fontSize: '12.5px', lineHeight: 1.6, color: colors.error }}>
            Some options could not be displayed because the sortedArgs payload contained entries that were not in the
            expected CommandArg shape. Re-generate this page via the docs pipeline to refresh the reference data.
          </p>
        )}
      </div>
    </div>
  );
}
