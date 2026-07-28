import type { EfsFilesystem } from '@stacktape/config/efs-filesystem';

declare global {
type StpEfsFilesystem = EfsFilesystem['properties'] & {
  name: string;
  type: EfsFilesystem['type'];
  configParentResourceType: EfsFilesystem['type'];
  nameChain: string[];
};
type EfsFilesystemReferencableParam = 'arn';
}
