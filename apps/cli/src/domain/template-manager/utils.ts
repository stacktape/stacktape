import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';

export const getInitialCfTemplate = (): CloudFormationTemplate => {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Resources: {},
    Outputs: {},
    Parameters: {}
  };
};
