import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type { StpHttpApiGateway } from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { stpErrors } from '@errors';
import { dirExists } from '@utils/fs-utils';
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
