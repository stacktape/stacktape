import { definitionHasProperty, getPropertyDescriptionInfo } from '@/utils/schema-extractor';
import configSchema from '../../../../@generated/schemas/enhanced-config-schema.json';
import { colors } from '../../styles/variables';

const PropDescription = ({
  definitionName,
  propertyName,
  descType = 'ld'
}: {
  definitionName: string;
  // name of the property
  // you can specify property prefix as well.
  // If property with given name is not found, function will try to find property whose name starts with the provided value
  propertyName: string;
  descType: 'ld' | 'sd';
}) => {
  const { definitions } = configSchema;

  let desc: { sd: string; ld: string };
  if (definitionName === 'ConfigRoot') {
    desc = configSchema?.properties?.[propertyName]?._MdxDesc || { sd: null, ld: null };
  } else {
    const propName = definitionHasProperty({
      definitions: definitions as unknown as { [defName: string]: ObjectSchemaNode },
      definitionName,
      propertyName
    })
      ? propertyName
      : (Object.keys(definitions[definitionName]?.properties || {}).find((prop) => prop.startsWith(propertyName)) ??
        propertyName);
    desc = getPropertyDescriptionInfo({
      definitions: definitions as unknown as { [defName: string]: ObjectSchemaNode },
      definitionName,
      propertyName: propName
    });
  }

  const rawHtml = `${desc[descType] || 'No description'}`;

  return (
    <div
      css={{
        color: colors.fontColorPrimary,
        lineHeight: 1.75,
        fontSize: '15px',
        letterSpacing: '0.025em',
        // paddingLeft: '4px',
        paddingBottom: '6px'
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: rawHtml }} />
    </div>
  );
};

export default PropDescription;
