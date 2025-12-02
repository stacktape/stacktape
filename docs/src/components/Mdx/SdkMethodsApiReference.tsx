import commandsSchema from '../../../../@generated/schemas/sdk-schema.json';
import { box, colors } from '../../styles/variables';
import { PropertyInfo } from './PropertiesTable';

export type CommandArg = {
  name: string;
  required: boolean;
  longDescription: string;
  shortDescription: string;
  alias?: string;
  allowedValues: string[];
  allowedTypes: string[];
};

function SdkMethodsApiReference({ command, sortedArgs }: { command: string; sortedArgs: CommandArg[] }) {
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
          background: colors.darkerBackground,
          fontWeight: 'bold',
          fontSize: '14px'
        }}
      >
        <p css={{ textAlign: 'left', width: '50%' }}>Arguments</p>
      </div>
      <div>
        {Object.keys(commandsSchema[command].args).length ? (
          sortedArgs.map(({ name, required, shortDescription, longDescription, allowedValues, allowedTypes }, idx) => {
            return (
              <PropertyInfo
                key={name}
                isLast={sortedArgs.length - 1 === idx}
                propertyName={name}
                idx={idx}
                propertyRequired={required}
                shortDescription={shortDescription}
                longDescription={longDescription}
                propertyTypeInfo={{
                  allowedTypes: [{ typeName: allowedTypes[0], enumeratedValues: allowedValues }],
                  isArray: false
                }}
              />
            );
          })
        ) : (
          <p css={{ padding: '10px' }}>No available options.</p>
        )}
      </div>
    </div>
  );
}

export default SdkMethodsApiReference;
