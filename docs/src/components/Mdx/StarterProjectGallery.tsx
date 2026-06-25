import { useMemo, useState } from 'react';
import { BiLogoGithub } from 'react-icons/bi';
import { LuArrowUpRight, LuPackage, LuSearch, LuX } from 'react-icons/lu';
import clsx from 'clsx';
import allStarterProjects from '../../../../starter-projects-metadata.json';
import { colors } from '../../styles/variables';
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

const chipClassName = (active: boolean) =>
  clsx(
    'inline-flex items-center gap-[6px] py-[5px] px-[12px] rounded-[999px] text-[0.82rem] font-medium cursor-pointer whitespace-nowrap border-none [transition:all_200ms_ease]',
    active
      ? 'text-fc-primary [background:linear-gradient(135deg,rgb(12,95,95),rgb(27,109,103))] [box-shadow:0_4px_12px_rgba(0,0,0,0.4),0_0_0_1px_rgba(81,231,236,0.45),inset_0_1px_0_rgba(43,232,239,0.35)]'
      : 'text-fc-lighter bg-element [box-shadow:0_2px_8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] hover:text-fc-primary'
  );

function StarterCard({ project }: { project: Project }) {
  const [iconOk, setIconOk] = useState(true);
  return (
    <div className="stp-box flex flex-col h-full py-[16px] px-[18px] [transition:transform_200ms_ease,box-shadow_200ms_ease] hover:[transform:translateY(-3px)] hover:[box-shadow:0_8px_20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.22)]">
      <div className="flex items-center gap-[11px] mb-[8px]">
        {iconOk ? (
          <Image
            src={`/starter-project-icons/${project.icon}`}
            width={26}
            height={26}
            // `!important` is required: the global `.mdx-content img` rule forces `width: 100%`,
            // which otherwise blows the icon up to the full card width.
            className="!p-0 shrink-0 !w-[26px] !h-[26px] object-contain"
            alt={`${project.name} icon`}
            onError={() => setIconOk(false)}
          />
        ) : (
          <span className="w-[26px] h-[26px] shrink-0 flex items-center justify-center rounded-[6px] text-brand [background:rgba(0,0,0,0.25)] [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <LuPackage size={15} />
          </span>
        )}
        <h3 className="text-[1.02rem] leading-[1.25] m-0">{project.name}</h3>
      </div>

      <p className="text-fc-lighter text-[0.88rem] leading-[1.5] mt-0 mr-0 mb-[12px] ml-0 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">
        {project.description.replace(/\s+/g, ' ').trim()}
      </p>

      <div className="flex flex-wrap gap-[6px] mb-[16px]">
        {project.tags.slice(0, 5).map((tag) => (
          <span
            key={tag}
            className="text-[0.72rem] font-medium text-fc-light py-[2px] px-[8px] rounded-[6px] [background:rgba(0,0,0,0.22)] [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex gap-[10px] mt-auto justify-end">
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
    <div className="mt-[24px]">
      <div className="flex flex-col gap-[14px] mb-[22px]">
        <label className="stp-input-box flex items-center gap-[10px] px-[14px] h-[44px] rounded-[10px] max-w-[460px]">
          <LuSearch size={18} color={colors.fontColorLightGray} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search starter projects"
            placeholder="Search by name, stack or service (e.g. postgres, next.js, redis)"
            className="flex-1 bg-transparent border-none outline-none text-fc-primary text-[0.92rem] placeholder:text-fc-light"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="flex items-center shrink-0 p-0 bg-transparent border-none cursor-pointer text-fc-light"
            >
              <LuX size={18} />
            </button>
          )}
        </label>

        <div className="flex flex-wrap gap-[8px]">
          {visibleCategories.map((category) => (
            <button
              key={category.key}
              type="button"
              aria-pressed={category.key === activeCategory}
              onClick={() => setActiveCategory(category.key)}
              className={chipClassName(category.key === activeCategory)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-fc-light text-[0.85rem] mt-0 mr-0 mb-[14px] ml-0">
        Showing {filtered.length} of {allStarterProjects.length} starter projects
      </p>

      {filtered.length > 0 ? (
        <GridList
          minItemWidth="340px"
          className="gap-[14px] max-[870px]:![grid-template-columns:1fr_1fr] max-[650px]:block max-[650px]:w-full max-[650px]:[&>div]:mb-[14px]"
        >
          {filtered.map((project) => (
            <StarterCard key={project.starterProjectId} project={project} />
          ))}
        </GridList>
      ) : (
        <div className="stp-box py-[40px] px-[20px] text-center text-fc-lighter">
          <p className="mt-0 mr-0 mb-[12px] ml-0">No starter projects match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveCategory('all');
            }}
            className={chipClassName(false)}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
