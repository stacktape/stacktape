import merge from 'lodash/merge';
import set from 'lodash/set';

/**
 * Applies one `overrides` entry (`path` → `value`) to CloudFormation resource properties. Template finalization and the
 * ECS hotswap use it, so a direct API update receives exactly the overridden properties CloudFormation would.
 */
export const applyResourceOverride = (resourceProperties: Record<string, any>, pathToProp: string, value: unknown) => {
  const firstDotIndex = pathToProp.indexOf('.');
  if (firstDotIndex > -1 && typeof value !== 'object') {
    const topLevelProperty = pathToProp.slice(0, firstDotIndex);
    const literalMapKey = pathToProp.slice(firstDotIndex + 1);
    const existingTopLevelValue = resourceProperties?.[topLevelProperty];
    const existingLooksLikeMapWithSpecialKeys =
      existingTopLevelValue &&
      typeof existingTopLevelValue === 'object' &&
      !Array.isArray(existingTopLevelValue) &&
      Object.keys(existingTopLevelValue).some((key) => !/^[A-Za-z0-9_]+$/.test(key));

    // CloudFormation maps such as RDS Parameters and OpenSearch
    // AdvancedOptions can contain dots in their literal keys.
    if (existingLooksLikeMapWithSpecialKeys || ['Parameters', 'AdvancedOptions'].includes(topLevelProperty)) {
      set(resourceProperties, topLevelProperty, {
        ...(resourceProperties?.[topLevelProperty] || {}),
        [literalMapKey]: value
      });
      return;
    }
  }

  const existingValue = resourceProperties?.[pathToProp];
  if (
    !pathToProp.includes('.') &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    existingValue &&
    typeof existingValue === 'object' &&
    !Array.isArray(existingValue)
  ) {
    set(resourceProperties, pathToProp, merge({}, existingValue, value));
    return;
  }

  set(resourceProperties, pathToProp, value);
};

/**
 * The CloudFormation resource types that have a property named `Properties` themselves (from the generated types in
 * `@stacktape/cloudformation`). For every other type, an override path that starts with `Properties` is a mistake.
 */
export const RESOURCE_TYPES_WITH_A_PROPERTIES_PROPERTY = new Set([
  'AWS::AmplifyUIBuilder::Component',
  'AWS::ApiGateway::DocumentationPart',
  'AWS::ElastiCache::ParameterGroup',
  'AWS::LicenseManager::LicenseAssetGroup',
  'AWS::SageMaker::Action',
  'AWS::SageMaker::Artifact',
  'AWS::SageMaker::Context',
  'AWS::ServiceDiscovery::PrivateDnsNamespace',
  'AWS::ServiceDiscovery::PublicDnsNamespace'
]);

const isCustomResourceType = (resourceType: string) =>
  resourceType === 'AWS::CloudFormation::CustomResource' || resourceType.startsWith('Custom::');

/**
 * What an override that starts with `Properties` means, or `undefined` when it is fine. Override paths are applied to
 * the child resource's `Properties` already: the r2ll dogfood followed an example with
 * `Properties.TimeToLiveSpecification` and got `Properties.Properties.TimeToLiveSpecification`, which CloudFormation
 * rejected during the deployment. A TypeScript override `{ Properties: { ... } }` did the same (r2pp). `intended` holds
 * the paths meant: the rest of a `Properties.` path, or the keys of the object under a bare `Properties` key. Custom
 * resources are left alone, as their provider defines their properties.
 */
export const getPropertiesPrefixMistake = ({
  resourceType,
  path,
  value
}: {
  resourceType: string;
  path: string;
  value: unknown;
}): { intended: string[] } | undefined => {
  if (path !== 'Properties' && !path.startsWith('Properties.')) return undefined;
  if (RESOURCE_TYPES_WITH_A_PROPERTIES_PROPERTY.has(resourceType) || isCustomResourceType(resourceType))
    return undefined;
  if (path !== 'Properties') return { intended: [path.slice('Properties.'.length)] };
  return { intended: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : [] };
};
