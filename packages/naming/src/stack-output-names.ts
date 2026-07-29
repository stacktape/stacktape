import { pascalCase } from 'change-case';

export const outputNames = {
  deploymentVersion() {
    return 'StpDeploymentVersion';
  },
  stackInfoMap() {
    return 'StpStackInfoMap';
  }
};

const capitalizeFirstLetter = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export const getStackOutputName = (resourceName: string, property: string) => {
  return pascalCase(`${resourceName}${capitalizeFirstLetter(property)}`).replace('_', '');
};

export const getExportedStackOutputName = (stackOutputName: string, stackName: string) => {
  return pascalCase(`${stackName}${capitalizeFirstLetter(stackOutputName)}`).replace('_', '');
};
