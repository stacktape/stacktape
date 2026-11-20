/**
 * Which Review layout to show while the owner compares them, read from the address bar the way `?start=` is:
 *
 * - `?review=columns` (default): the diagram, the settings of what is picked, and stacktape.yml side by side.
 * - `?review=stack`: the diagram over a list of the resources, each opening to its settings, beside stacktape.yml.
 * - `?review=canvas`: the diagram fills the space; a picked resource's settings slide in over its right edge.
 *
 * `?terms=` sets how settings are named: `both` (default, the plain name with AWS's under it), `plain` or `aws` (AWS's
 * name first). Deleted, with the versions not picked, once one is chosen.
 */
export type ReviewLayout = 'columns' | 'stack' | 'canvas';
export type SettingTerms = 'both' | 'plain' | 'aws';

export const reviewLayout = (search: string): ReviewLayout => {
  const value = new URLSearchParams(search).get('review')?.toLowerCase();
  return value === 'stack' || value === 'canvas' ? value : 'columns';
};

export const settingTerms = (search: string): SettingTerms => {
  const value = new URLSearchParams(search).get('terms')?.toLowerCase();
  return value === 'plain' || value === 'aws' ? value : 'both';
};
