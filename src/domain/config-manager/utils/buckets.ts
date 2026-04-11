import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { stpErrors } from '@errors';
import { dirExists } from '@shared/utils/fs-utils';
import { configManager } from '../index';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToBucket = ({
  stpResourceReference,
  referencedFromType,
  referencedFrom
}: {
  stpResourceReference: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'bucket',
    referencedFrom,
    referencedFromType
  });
};

const validateCdnHeaderPresetConflict = (definition: StpBucket) => {
  if (definition.directoryUpload?.headersPreset) {
    const { simplifiedCdnAssociations, allHttpApiGateways, allBuckets, allApplicationLoadBalancers } = configManager;
    [...allHttpApiGateways, ...allBuckets, ...allApplicationLoadBalancers]
      .filter(({ name }) => simplifiedCdnAssociations[definition.type][definition.name]?.includes(name))
      .forEach((_resource: StpBucket | StpApplicationLoadBalancer | StpHttpApiGateway) => {
        // if (resource.cdn.invalidateAfterDeploy === false) {
        //   throw new ExpectedError(
        //     'CONFIG_VALIDATION',
        //     `CDN attached to resource ${printer.colorize(
        //       'red',
        //       resource.name
        //     )} has 'headersPreset' parameter set to 'false'.\nAutomatic invalidation after deploy cannot be disabled if targeted bucket (${
        //       definition.name
        //     }) uses 'headersPreset' parameter in 'directoryUpload' configuration.`
        //   );
        // }
      });
  }
};

export const validateBucketConfig = ({ definition }: { definition: StpBucket }) => {
  validateCdnHeaderPresetConflict(definition);
};

export const validateHostingBucketConfig = ({ definition }: { definition: StpHostingBucket }) => {
  if (definition.build?.workingDirectory) {
    const absoluteWorkingDirectory = join(globalStateManager.workingDir, definition.build.workingDirectory);
    if (!dirExists(absoluteWorkingDirectory)) {
      throw stpErrors.e142({
        directoryPath: definition.build.workingDirectory,
        stpResourceName: definition.name,
        propertyName: 'build.workingDirectory',
        resolvedPath: absoluteWorkingDirectory
      });
    }
  }
};
