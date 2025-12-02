import dbVersionsList from '../../../../@generated/db-engine-versions/versions.json';
import { colors } from '../../styles/variables';
import ExpandableItem from '../Utils/ExpandableItem';

export function EngineVersionsList({ resourceType }: { resourceType: 'rds' }) {
  const enginesWithVersions = dbVersionsList[resourceType];

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
      <div>
        {Object.entries(enginesWithVersions).map(([engineName, list]) => (
          <ExpandableItem
            key={engineName}
            title={engineName}
            expandedContent={list.map((version) => (
              <p key={version}>
                <code>{version}</code>
              </p>
            ))}
          />
        ))}
      </div>
    </div>
  );
}
