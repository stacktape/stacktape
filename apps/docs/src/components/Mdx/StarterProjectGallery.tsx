import { useMemo, useState } from 'react';
import { Check, Copy } from 'react-feather';
import { LuArrowUpRight, LuPackage, LuSearch, LuX } from 'react-icons/lu';
import { publicStarterProjects, type StarterProject } from '@/utils/starter-projects';
import { Img as Image } from '@/components/Img';

type Project = StarterProject;

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
        'redis',
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

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="docs-starter-command">
      <code>{command}</code>
      <button
        type="button"
        className={copied ? 'docs-code-copy is-copied' : 'docs-code-copy'}
        aria-label={copied ? 'Copied' : `Copy ${command}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      </button>
    </div>
  );
}

function StarterCard({ project }: { project: Project }) {
  const [iconOk, setIconOk] = useState(true);
  return (
    <li className="docs-starter-card">
      <div className="docs-starter-head">
        {iconOk ? (
          <Image
            src={`/starter-project-icons/${project.icon}`}
            width={24}
            height={24}
            className="docs-starter-icon"
            alt={`${project.name} icon`}
            onError={() => setIconOk(false)}
          />
        ) : (
          <span className="docs-starter-icon is-fallback" aria-hidden>
            <LuPackage size={14} />
          </span>
        )}
        <h3 className="docs-starter-name">{project.name}</h3>
      </div>
      <p className="docs-starter-description">{project.description.replace(/\s+/g, ' ').trim()}</p>
      {project.tags.length > 0 && <p className="docs-starter-tags">{project.tags.slice(0, 5).join(' · ')}</p>}
      <CopyCommand command={`npx stacktape init --starter-id ${project.starterProjectId}`} />
      <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="docs-starter-source">
        Source on GitHub
        <LuArrowUpRight size={13} aria-hidden />
      </a>
    </li>
  );
}

export function StarterProjectGallery() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.key === 'all' || publicStarterProjects.some((p) => c.match(p))),
    []
  );

  const filtered = useMemo(() => {
    const category = categories.find((c) => c.key === activeCategory) ?? categories[0];
    return publicStarterProjects.filter((p) => category.match(p) && matchesQuery(p, query));
  }, [query, activeCategory]);

  return (
    <div className="docs-starters">
      <div className="docs-starters-controls">
        <label className="docs-starters-search">
          <LuSearch size={16} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search starter projects"
            placeholder="Search starters, e.g. postgres or next.js"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
              <LuX size={16} aria-hidden />
            </button>
          )}
        </label>
        <div className="docs-starters-filters">
          {visibleCategories.map((category) => (
            <button
              key={category.key}
              type="button"
              aria-pressed={category.key === activeCategory}
              onClick={() => setActiveCategory(category.key)}
              className="docs-chip"
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <p className="docs-starters-count" aria-live="polite">
        Showing {filtered.length} of {publicStarterProjects.length} starter projects
      </p>

      {filtered.length > 0 ? (
        <ul className="docs-starters-grid">
          {filtered.map((project) => (
            <StarterCard key={project.starterProjectId} project={project} />
          ))}
        </ul>
      ) : (
        <div className="docs-starters-empty">
          <p>No starter projects match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveCategory('all');
            }}
            className="docs-chip"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
