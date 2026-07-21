import allStarterProjects from '../../../starter-projects-metadata.json';

// These starters exist in the monorepo but do not have public GitHub repositories yet.
// Keep them out of the public catalogue so the docs never advertise broken GitHub and
// one-click deployment links. Remove an ID when its repository is published.
const unpublishedStarterProjectIds = new Set([
  'agentcore-customer-support-agent',
  'agentcore-data-analyst',
  'agentcore-research-assistant',
  's3files-dataset-reporting',
  's3files-model-inference-api'
]);

export const publicStarterProjects = allStarterProjects.filter(
  (project) => !unpublishedStarterProjectIds.has(project.starterProjectId)
);
