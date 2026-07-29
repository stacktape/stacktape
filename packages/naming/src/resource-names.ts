import { createHash } from 'node:crypto';

class ObfuscatedNamesStateHolder {
  usingObfuscateNames = false;

  setUsingObfuscatedNamesToTrue = () => {
    this.usingObfuscateNames = true;
  };
}

export const obfuscatedNamesStateHolder = new ObfuscatedNamesStateHolder();

export const buildResourceName = ({
  proposedResourceName,
  lengthLimit
}: {
  proposedResourceName: string;
  lengthLimit?: number;
}) => {
  if (lengthLimit && proposedResourceName.length > lengthLimit) {
    obfuscatedNamesStateHolder.setUsingObfuscatedNamesToTrue();
    const hashedName = createHash('shake256', { outputLength: 3 }).update(proposedResourceName).digest('hex');
    return `${proposedResourceName.slice(0, lengthLimit - hashedName.length - 1)}-${hashedName}`;
  }
  return proposedResourceName;
};

export const getLogGroupBaseName = ({
  stpResourceName,
  stackName,
  resourceNamespace,
  resourceType
}: {
  stackName: string;
  resourceType: 'ecs' | 'rds' | 'lambda' | 'api-gateway' | 'batch' | 'redis' | 'open-search' | 'bastion';
  stpResourceName: string;
  resourceNamespace: string;
}) => {
  return `/stp/${stackName}/${resourceType}/${stpResourceName}/${resourceNamespace}`;
};
