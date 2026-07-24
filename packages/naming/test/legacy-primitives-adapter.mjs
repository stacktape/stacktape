import { createHash } from 'node:crypto';

export const capitalizeFirstLetter = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export const shortHash = (text) => {
  let hash = 5381;
  let index = text.length;
  while (index) {
    hash = (hash * 33) ^ text.charCodeAt(--index);
  }
  return (hash >>> 0).toString(16);
};

export const buildResourceName = ({ proposedResourceName, lengthLimit }) => {
  if (lengthLimit && proposedResourceName.length > lengthLimit) {
    const hashedName = createHash('shake256', { outputLength: 3 }).update(proposedResourceName).digest('hex');
    return `${proposedResourceName.slice(0, lengthLimit - hashedName.length - 1)}-${hashedName}`;
  }
  return proposedResourceName;
};

export const getLogGroupBaseName = ({ stpResourceName, stackName, resourceNamespace, resourceType }) =>
  `/stp/${stackName}/${resourceType}/${stpResourceName}/${resourceNamespace}`;

export const STACKTAPE_CF_TEMPLATE_DESCRIPTION_PREFIX = 'STP-stack';
export const CF_TEMPLATE_FILE_NAME_WITHOUT_EXT = 'cf-template';
export const STP_TEMPLATE_FILE_NAME_WITHOUT_EXT = 'stp-template';
export const Ref = (logicalName) => ({ Ref: logicalName });
export const Sub = (template, variables) => ({ 'Fn::Sub': [template, variables] });
export const arns = {
  iamRole({ accountId, roleAwsName }) {
    return `arn:aws:iam::${accountId}:role/${roleAwsName}`;
  }
};
