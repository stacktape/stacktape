import type { EfsFilesystem } from '@stacktape/config/efs-filesystem';

export type StpEfsFilesystem = EfsFilesystem['properties'] & {
  name: string;
  type: EfsFilesystem['type'];
  configParentResourceType: EfsFilesystem['type'];
  nameChain: string[];
};
export type EfsFilesystemReferencableParam = 'arn' | 'id';
