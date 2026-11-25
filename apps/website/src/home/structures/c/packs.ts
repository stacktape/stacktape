import { sectionPack } from '../../sections';

/** A section pack that has a picture; the page fails to build if it has none. */
export const pack = (id: string) => {
  const found = sectionPack(id);
  if (!found.picture) throw new Error(`Section pack ${id} has no picture`);
  return { ...found, picture: found.picture };
};
