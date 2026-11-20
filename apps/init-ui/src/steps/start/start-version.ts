/**
 * Which version of the first screen to show while the owner compares them: `?start=g1|g2|g3`, g1 by default.
 * Deleted, with the two versions not picked, once one is chosen.
 */
export type StartVersion = 'g1' | 'g2' | 'g3';

export const startVersion = (search: string): StartVersion => {
  const value = new URLSearchParams(search).get('start')?.toLowerCase();
  return value === 'g2' || value === 'g3' ? value : 'g1';
};
