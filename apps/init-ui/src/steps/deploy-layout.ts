/**
 * How the Deploy step is laid out while the owner compares two versions: `?deploy=split|column`, split by default.
 *
 * `split`: the checklist on the left, and on the right a summary that stays in view: where it deploys, what it creates
 * and costs, and the Deploy button. `column`: one column, with the same summary under the checklist and the button in
 * the bottom bar. Under 1200 px wide both are one column.
 *
 * Deleted, with the version not picked, once one is chosen.
 */
export type DeployLayout = 'split' | 'column';

export const deployLayout = (search: string): DeployLayout =>
  new URLSearchParams(search).get('deploy')?.toLowerCase() === 'column' ? 'column' : 'split';
