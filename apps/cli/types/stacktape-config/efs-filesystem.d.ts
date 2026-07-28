type StpEfsFilesystem = EfsFilesystem['properties'] & {
  name: string;
  type: EfsFilesystem['type'];
  configParentResourceType: EfsFilesystem['type'];
  nameChain: string[];
};
type EfsFilesystemReferencableParam = 'arn';
