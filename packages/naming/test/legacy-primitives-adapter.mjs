import { createHash } from 'node:crypto';

const splitLowerUpper = /([\p{Ll}\d])(\p{Lu})/gu;
const splitUpperUpper = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
const stripNonWord = /[^\p{L}\d]+/giu;

const splitWords = (value) => {
  let result = value
    .trim()
    .replace(splitLowerUpper, '$1\0$2')
    .replace(splitUpperUpper, '$1\0$2')
    .replace(stripNonWord, '\0');
  let start = 0;
  let end = result.length;
  while (result.charAt(start) === '\0') {
    start += 1;
  }
  if (start === end) {
    return [];
  }
  while (result.charAt(end - 1) === '\0') {
    end -= 1;
  }
  result = result.slice(start, end);
  return result.split('\0');
};

export const pascalCase = (input) =>
  splitWords(input)
    .map((word, index) => {
      const first = word[0] ?? '';
      const initial = index > 0 && first >= '0' && first <= '9' ? `_${first}` : first.toLocaleUpperCase();
      return initial + word.slice(1).toLocaleLowerCase();
    })
    .join('');

export const snakeCase = (input) =>
  splitWords(input)
    .map((word) => word.toLocaleLowerCase())
    .join('_');

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
