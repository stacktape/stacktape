import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { getAtt, join, select, split } from '@stacktape/cloudformation/intrinsics';

type TemplateResource = CloudFormationTemplate['Resources'][string];

/**
 * Aurora names an instance endpoint `<instance identifier>.<suffix>` and its cluster endpoint
 * `<cluster identifier>.cluster-<suffix>`, so an instance's address is known as soon as its cluster exists. Identifiers
 * cannot contain dots, so the cluster endpoint contains `.cluster-` exactly once.
 */
export const getAuroraInstanceAddressFromCluster = ({
  clusterLogicalName,
  instanceIdentifier
}: {
  clusterLogicalName: string;
  instanceIdentifier: string;
}) =>
  join('', [
    `${instanceIdentifier.toLowerCase()}.`,
    select(1, split('.cluster-', getAtt(clusterLogicalName, 'Endpoint.Address')))
  ]);

const isInstanceAddress = (value: unknown, instanceLogicalName: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const attribute = (value as Record<string, unknown>)['Fn::GetAtt'];
  return (
    (Array.isArray(attribute) && attribute[0] === instanceLogicalName && attribute[1] === 'Endpoint.Address') ||
    attribute === `${instanceLogicalName}.Endpoint.Address`
  );
};

const containsInstanceAddress = (value: unknown, instanceLogicalName: string): boolean => {
  if (isInstanceAddress(value, instanceLogicalName)) return true;
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some((item) => containsInstanceAddress(item, instanceLogicalName));
};

const replaceInstanceAddress = (value: unknown, instanceLogicalName: string, replacement: unknown): unknown => {
  if (isInstanceAddress(value, instanceLogicalName)) return replacement;
  if (Array.isArray(value)) return value.map((item) => replaceInstanceAddress(item, instanceLogicalName, replacement));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceInstanceAddress(item, instanceLogicalName, replacement)])
  );
};

const propertiesOf = (resource: TemplateResource | undefined) =>
  (resource?.Properties || {}) as Record<string, unknown>;

const referenceOf = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>).Ref : undefined;

const hasProvisionedConcurrency = (template: CloudFormationTemplate, functionLogicalName: string) =>
  Object.values(template.Resources).some(
    (resource: TemplateResource) =>
      resource.Type === 'AWS::Lambda::Alias' &&
      referenceOf(propertiesOf(resource).FunctionName) === functionLogicalName &&
      propertiesOf(resource).ProvisionedConcurrencyConfig !== undefined
  );

/**
 * Lets a new Lambda function be created while the Aurora instances it connects to are still being created.
 *
 * A function that receives an instance address (the `hosts` parameter) references the instance, so CloudFormation
 * creates the function only after the instance, which takes about 7 minutes. A function in a VPC then spends another few
 * minutes on its network interfaces. Nothing runs a new function during the deployment, so this rewrites the address
 * from the cluster endpoint and the two waits overlap. Other workloads keep waiting for the instances: a container
 * service starts its tasks during the deployment and its circuit breaker rolls the deployment back when they fail.
 *
 * A function keeps the instance reference when:
 * - it is deployed and is updated to reach an instance that does not exist yet (a new one, or one replaced under a new
 *   identifier): a deployed function serves traffic, and its new configuration must not take effect before that
 *   instance exists;
 * - it is deployed with the reference, so this change does not update deployed functions;
 * - it has provisioned concurrency, whose environments run the function's initialization code during the deployment;
 * - the instance's identifier is not a literal, so its address cannot be derived.
 */
export const deriveAuroraInstanceAddressesForNewFunctions = ({
  template,
  deployedTemplate
}: {
  template: CloudFormationTemplate;
  deployedTemplate: CloudFormationTemplate;
}) => {
  const deployedResources = deployedTemplate.Resources || {};
  const instances = Object.entries(template.Resources).flatMap(([instanceLogicalName, instance]) => {
    if (instance.Type !== 'AWS::RDS::DBInstance') return [];
    const { DBClusterIdentifier, DBInstanceIdentifier: instanceIdentifier } = propertiesOf(instance);
    const clusterLogicalName = referenceOf(DBClusterIdentifier);
    if (
      typeof clusterLogicalName !== 'string' ||
      template.Resources[clusterLogicalName]?.Type !== 'AWS::RDS::DBCluster' ||
      typeof instanceIdentifier !== 'string'
    ) {
      return [];
    }
    return [
      {
        instanceLogicalName,
        instanceIdentifier,
        address: getAuroraInstanceAddressFromCluster({ clusterLogicalName, instanceIdentifier })
      }
    ];
  });
  if (!instances.length) return;

  Object.entries(template.Resources).forEach(([functionLogicalName, lambdaFunction]) => {
    if (lambdaFunction.Type !== 'AWS::Lambda::Function' || !lambdaFunction.Properties) return;
    if (hasProvisionedConcurrency(template, functionLogicalName)) return;
    const deployedFunction = deployedResources[functionLogicalName];
    instances.forEach(({ instanceLogicalName, instanceIdentifier, address }) => {
      if (!containsInstanceAddress(lambdaFunction.Properties, instanceLogicalName)) return;
      if (deployedFunction) {
        const deployedInstance = deployedResources[instanceLogicalName];
        if (
          !deployedInstance ||
          propertiesOf(deployedInstance).DBInstanceIdentifier !== instanceIdentifier ||
          containsInstanceAddress(deployedFunction.Properties, instanceLogicalName)
        ) {
          return;
        }
      }
      lambdaFunction.Properties = replaceInstanceAddress(
        lambdaFunction.Properties,
        instanceLogicalName,
        address
      ) as typeof lambdaFunction.Properties;
    });
  });
};
