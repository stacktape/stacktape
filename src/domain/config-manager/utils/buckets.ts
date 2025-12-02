// import { stpErrors } from '@errors';
// import { ExpectedError } from '@utils/errors';
// import { printer } from '@utils/printer';
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
