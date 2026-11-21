/**
 * Which layout of the Deploying screen to show while the owner compares them: `?deploying=steps|log`, `steps` by
 * default. `steps` keeps the diagram and puts the steps (phases, then each AWS resource) beside it, with the log one
 * tab away; `log` leads with the log, a section per phase the way a CI run reads, and keeps the diagram and the
 * phases in a column beside it. Deleted, with the version not picked, once one is chosen.
 */
export type DeployingVersion = 'steps' | 'log';

export const deployingVersion = (search: string): DeployingVersion =>
  new URLSearchParams(search).get('deploying')?.toLowerCase() === 'log' ? 'log' : 'steps';
