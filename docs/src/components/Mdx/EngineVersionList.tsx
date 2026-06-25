import dbVersionsList from '../../../../@generated/db-engine-versions/versions.json';
import ExpandableItem from '../Utils/ExpandableItem';

export function EngineVersionsList({ resourceType }: { resourceType: 'rds' }) {
  const enginesWithVersions = dbVersionsList[resourceType];

  return (
    <div className="pb-[6px] text-[15px] leading-[1.75] tracking-[0.025em] text-fc-primary">
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
