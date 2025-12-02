import { merge } from 'lodash';
import jargonData from '../../../docs/jargon.yml';
import { WithTooltip } from '../Tooltip/WithTooltip';

const validateProperty = (entry, property, key) => {
  const value = entry[property];
  if (typeof value === 'undefined' || value === null || value.length === 0) {
    throw new Error(`Property '${property}' is not defined for jargon entry '${key}'!`);
  }
};

export const jargon = {};
for (const key in jargonData) {
  const entry = jargonData[key];
  validateProperty(entry, 'description', key);
  let longDescription = `<p><b>${key}</b>`;

  const { longName } = entry;
  if (typeof longName !== 'undefined' && longName !== null && longName.length > 0) {
    longDescription += ` - ${longName}`;
  }
  longDescription += `</p><p style="padding-top: 5px">${entry.description}</p>`;
  jargon[key] = longDescription;
}

export function Jargon({ children }: { children: string }) {
  const wordName = children;
  const description = jargon[wordName];

  if (!description) {
    return <em>{wordName}</em>;
  }

  return (
    <WithTooltip
      tooltipText={<div css={{ padding: '5px' }} dangerouslySetInnerHTML={{ __html: description }} />}
      trigger="hover"
    >
      <span css={merge({ cursor: 'help' })}>
        <em
          css={{
            '&:after': {
              content: '"?"',
              fontWeight: 'bold',
              display: 'inline-block',
              transform: 'translate(0, -0.35em)',
              fontSize: '90%',
              color: 'rgb(27 211 176)',
              marginLeft: '3px'
            }
          }}
        >
          {wordName}
        </em>
      </span>
    </WithTooltip>
  );
}
