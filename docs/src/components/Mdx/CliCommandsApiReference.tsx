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

export function CliCommandsApiReference({ command, sortedArgs }: { command: string; sortedArgs: CommandArg[] }) {
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
          sortedArgs.map(
            ({ name, required, shortDescription, longDescription, alias, allowedValues, allowedTypes }, idx) => (
              <PropertyInfo
                key={name}
                propertyName={alias ? `${name} (--${alias})` : name}
                idx={idx}
                isLast={sortedArgs.length - 1 === idx}
                propertyRequired={required}
                shortDescription={shortDescription}
                longDescription={longDescription}
                propertyTypeInfo={{
                  allowedTypes: [{ typeName: allowedTypes[0], enumeratedValues: allowedValues }],
                  isArray: false
                }}
              />
            )
          )
        ) : (
          <p css={{ padding: '10px' }}>No available options.</p>
        )}
      </div>
    </div>
  );
}
