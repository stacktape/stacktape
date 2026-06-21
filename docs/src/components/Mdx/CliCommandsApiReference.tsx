import { box, colors } from '../../styles/variables';
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

export function CliCommandsApiReference({ command, sortedArgs = [] }: { command: string; sortedArgs?: CommandArg[] }) {
  return (
    <div
      id={`api-ref-${command}`}
      css={{
        ...box,
        background: colors.backgroundColor,
        marginBottom: '15px',
        marginTop: '12px'
      }}
    >
      <div
        css={{
          display: 'flex',
          padding: '12px',
          background: colors.backgroundColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }}
      >
        <p css={{ textAlign: 'left', width: '50%' }}>Options</p>
      </div>
      <div>
        {sortedArgs.length > 0 ? (
          // Defensive: a malformed sortedArgs prop (e.g. an array of strings instead of
          // CommandArg objects, which the docs generation pipeline has accidentally produced)
          // would otherwise crash the production build's prerender pass. Filter out anything
          // that isn't a recognizable arg object and render a small inline warning instead.
          sortedArgs
            .filter((arg): arg is CommandArg => arg != null && typeof arg === 'object' && 'name' in arg)
            .map((arg, idx, validArgs) => {
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
          <p css={{ padding: '10px' }}>No available options.</p>
        )}
        {sortedArgs.some((arg) => arg == null || typeof arg !== 'object' || !('name' in arg)) && (
          <p css={{ padding: '10px', color: '#e25a4d', fontSize: '12px' }}>
            Some options could not be displayed because the sortedArgs payload contained entries
            that were not in the expected CommandArg shape. Re-generate this page via the docs
            pipeline to refresh the reference data.
          </p>
        )}
      </div>
    </div>
  );
}
