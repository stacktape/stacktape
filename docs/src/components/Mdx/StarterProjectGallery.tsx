import { useMemo, useState } from 'react';
import { BiLogoGithub } from 'react-icons/bi';
import { LuArrowUpRight, LuPackage, LuSearch, LuX } from 'react-icons/lu';
import allStarterProjects from '../../../../starter-projects-metadata.json';
import { onMaxW650, onMaxW870 } from '../../styles/responsive';
import { box, colors, inputBoxStyle } from '../../styles/variables';
import { Img as Image } from '../Img';
import { Button } from '../Button/Button';
import { GridList } from '../Misc/GridList';

type Project = (typeof allStarterProjects)[number];

const hasAny = (values: string[], candidates: string[]) => values.some((v) => candidates.includes(v));

const categories: { key: string; label: string; match: (p: Project) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  {
    key: 'web',
    label: 'Web & Frontend',
    match: (p) => p.isWebsite || p.isSpaWebsite || p.isStaticWebsite || p.isServerSideRenderedWebsite
  },
  {
    key: 'api',
    label: 'APIs',
    match: (p) => p.isRestApi || hasAny(p.tags, ['GraphQL', 'Websocket API'])
  },
  {
    key: 'ai',
    label: 'AI & Agents',
    match: (p) =>
      hasAny(p.tags, ['AI', 'AgentCore', 'Machine learning', 'Tensorflow']) ||
      ['gpu-inference-api', 's3files-model-inference-api'].includes(p.starterProjectId)
  },
  {
    key: 'databases',
    label: 'Databases',
    match: (p) =>
      hasAny(p.usedResourceTypes, [
        'relational-database',
        'dynamo-db-table',
        'mongo-db-atlas-cluster',
        'redis-cluster',
        'open-search-domain'
      ])
  },
  {
    key: 'event-driven',
    label: 'Event-driven',
    match: (p) =>
      hasAny(p.tags, ['Event-Driven', 'Kinesis', 'SNS', 'Step Functions']) ||
      hasAny(p.usedResourceTypes, ['sqs-queue', 'sns-topic', 'event-bus', 'state-machine', 'kinesis-stream'])
  },
  {
    key: 'containers',
    label: 'Containers & self-hosted',
    match: (p) =>
      p.projectType === 'docker' ||
      hasAny(p.usedResourceTypes, ['multi-container-workload', 'web-service', 'private-service', 'worker-service'])
  }
];

const matchesQuery = (p: Project, query: string) => {
  if (!query) return true;
  const haystack = [p.name, p.description, p.starterProjectId, p.projectType, ...p.tags, ...p.usedResourceTypes]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
};

const chipCss = (active: boolean): Css => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 12px',
  borderRadius: '999px',
  fontSize: '0.82rem',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  color: active ? colors.fontColorPrimary : colors.fontColorLighterGray,
  background: active ? 'linear-gradient(135deg, rgb(12, 95, 95), rgb(27, 109, 103))' : colors.elementBackground,
  boxShadow: active
    ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(81, 231, 236, 0.45), inset 0 1px 0 rgba(43, 232, 239, 0.35)'
    : '0 2px 8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
  border: 'none',
  transition: 'all 200ms ease',
  '&:hover': { color: colors.fontColorPrimary }
});

function StarterCard({ project }: { project: Project }) {
  const [iconOk, setIconOk] = useState(true);
  return (
    <div
      css={{
        ...box,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px 18px',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow:
            '0 8px 20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.22)'
        }
      }}
    >
      <div css={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '8px' }}>
        {iconOk ? (
          <Image
            src={`/starter-project-icons/${project.icon}`}
            width={26}
            height={26}
            // `!important` is required: the global `.mdx-content img` rule forces `width: 100%`,
            // which otherwise blows the icon up to the full card width.
            css={{
              padding: '0 !important',
              flexShrink: 0,
              width: '26px !important',
              height: '26px !important',
              objectFit: 'contain'
            }}
            alt={`${project.name} icon`}
            onError={() => setIconOk(false)}
          />
        ) : (
          <span
            css={{
              width: 26,
              height: 26,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: colors.brandGreen,
              background: 'rgba(0, 0, 0, 0.25)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)'
            }}
          >
            <LuPackage size={15} />
          </span>
        )}
        <h3 css={{ fontSize: '1.02rem', lineHeight: 1.25, margin: 0 }}>{project.name}</h3>
      </div>

      <p
        css={{
          color: colors.fontColorLighterGray,
          fontSize: '0.88rem',
          lineHeight: 1.5,
          margin: '0 0 12px 0',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {project.description.replace(/\s+/g, ' ').trim()}
      </p>

      <div css={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {project.tags.slice(0, 5).map((tag) => (
          <span
            key={tag}
            css={{
              fontSize: '0.72rem',
              fontWeight: 500,
              color: colors.fontColorLightGray,
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.22)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.06)'
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div css={{ display: 'flex', gap: '10px', marginTop: 'auto', justifyContent: 'flex-end' }}>
        <Button
          icon={<BiLogoGithub size={18} />}
          text="GitHub"
          iconPosition="end"
          visualType="secondary"
          width="fit-content"
          linkTo={project.githubLink}
        />
        <Button
          icon={<LuArrowUpRight size={18} />}
          iconPosition="end"
          text="Deploy"
          visualType="primary"
          width="fit-content"
          linkTo={`https://console.stacktape.com/create-new-project/git-project-using-console?name=my-stacktape-app&repositoryType=public&repositoryUrl=${project.githubLink}`}
        />
      </div>
    </div>
  );
}

export function StarterProjectGallery() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.key === 'all' || allStarterProjects.some((p) => c.match(p))),
    []
  );

  const filtered = useMemo(() => {
    const category = categories.find((c) => c.key === activeCategory) ?? categories[0];
    return allStarterProjects.filter((p) => category.match(p) && matchesQuery(p, query));
  }, [query, activeCategory]);

  return (
    <div css={{ marginTop: '24px' }}>
      <div css={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
        <label
          css={{
            ...inputBoxStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0 14px',
            height: '44px',
            borderRadius: '10px',
            maxWidth: '460px'
          }}
        >
          <LuSearch size={18} color={colors.fontColorLightGray} css={{ flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search starter projects"
            placeholder="Search by name, stack or service (e.g. postgres, next.js, redis)"
            css={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.fontColorPrimary,
              fontSize: '0.92rem',
              '::placeholder': { color: colors.fontColorLightGray }
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              css={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: colors.fontColorLightGray
              }}
            >
              <LuX size={18} />
            </button>
          )}
        </label>

        <div css={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {visibleCategories.map((category) => (
            <button
              key={category.key}
              type="button"
              aria-pressed={category.key === activeCategory}
              onClick={() => setActiveCategory(category.key)}
              css={chipCss(category.key === activeCategory)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <p css={{ color: colors.fontColorLightGray, fontSize: '0.85rem', margin: '0 0 14px 0' }}>
        Showing {filtered.length} of {allStarterProjects.length} starter projects
      </p>

      {filtered.length > 0 ? (
        <GridList
          minItemWidth="340px"
          rootCss={{
            gridGap: '14px',
            [onMaxW870]: { gridTemplateColumns: '1fr 1fr' },
            [onMaxW650]: { display: 'block', width: '100%', '> div': { marginBottom: '14px' } }
          }}
        >
          {filtered.map((project) => (
            <StarterCard key={project.starterProjectId} project={project} />
          ))}
        </GridList>
      ) : (
        <div
          css={{
            ...box,
            padding: '40px 20px',
            textAlign: 'center',
            color: colors.fontColorLighterGray
          }}
        >
          <p css={{ margin: '0 0 12px 0' }}>No starter projects match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveCategory('all');
            }}
            css={chipCss(false)}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
