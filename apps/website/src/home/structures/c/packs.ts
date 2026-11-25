import { SECTION_PACKS } from '../../sections';

type PackId = (typeof SECTION_PACKS)[number]['id'];

/** A section pack by id; the page fails to build if a pack it uses is missing. */
export const pack = (id: PackId) => {
  const found = SECTION_PACKS.find((candidate) => candidate.id === id);
  if (!found?.picture) throw new Error(`Section pack ${id} has no picture`);
  return { ...found, picture: found.picture };
};
