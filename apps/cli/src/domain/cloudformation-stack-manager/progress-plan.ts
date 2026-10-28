/**
 * The resources a stack operation's progress counts: the logical IDs of a hot-swap-free update's changes, or those of
 * the template diff. `undefined` counts every resource CloudFormation reports. A create or delete has counts but no
 * names, and an empty set would filter out every resource that completes, leaving progress at 0/N.
 */
export const getPlannedResources = ({
  updatedResourceLogicalNames,
  changeLists
}: {
  updatedResourceLogicalNames?: string[];
  changeLists: { created: string[]; updated: string[]; deleted: string[] };
}): Set<string> | undefined => {
  if (updatedResourceLogicalNames?.length) return new Set(updatedResourceLogicalNames);
  const fromDiff = new Set([...changeLists.created, ...changeLists.updated, ...changeLists.deleted]);
  return fromDiff.size ? fromDiff : undefined;
};
