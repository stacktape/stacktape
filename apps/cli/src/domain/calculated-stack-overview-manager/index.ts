import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { KnownCloudFormationResourceType } from '@stacktape/cloudformation/resource';
import type { StackInfoMapResource } from '@domain-services/stack-info/types';
import type { OutputValue, StackInfoMap, StacktapeResourceOutput } from '@domain-services/stack-info/types';
import type {
  StacktapeResourceReferenceableParam,
  StpResource,
  StpResourceType
} from '@domain-services/config-manager/resolved-types/resources';
import { configManager } from '@domain-services/config-manager';
import { getEmailSenderBindingsFingerprint } from '@domain-services/email-sender-manager/bindings-fingerprint';
import { templateManager } from '@domain-services/template-manager';
import { consoleLinks } from '@stacktape/naming/console-links';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { buildSSMParameterNameForReferencableParam } from '@stacktape/naming/ssm-parameter-paths';
import { PARENT_IDENTIFIER_CUSTOM_CF, PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { serialize } from '@utils/misc';
import { getCloudformationChildResources } from '@utils/stack-info-map';
import compose from '@utils/compose';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { kebabCase } from 'change-case';
import get from 'lodash/get';
import type { StackContext } from '@domain-services/stack-context';
import { getSharedResourceStackName } from '@stacktape/naming/shared-stacks';

class CalculatedStackOverviewManager {
  stackInfoMap: StackInfoMap = { metadata: {}, resources: {}, customOutputs: {} };
  #context: StackContext | undefined;

  get context(): StackContext {
    if (!this.#context) {
      throw new Error('Calculated stack overview manager was used before its synthesis context was initialized.');
    }
    return this.#context;
  }

  init = async ({ context }: { context: StackContext }) => {
    this.#context = Object.freeze({ ...context });
  };

  reset = () => {
    this.stackInfoMap = { metadata: {}, resources: {}, customOutputs: {} };
    this.#context = undefined;
  };

  get resourceCount() {
    return Object.values(this.stackInfoMap.resources)
      .flat()
      .map(({ cloudformationChildResources }) => Object.keys(cloudformationChildResources).length)
      .reduce((a, b) => a + b, 0);
  }

  getStpResource = ({ nameChain }: { nameChain: string[] | string }) => {
    const chain = typeof nameChain === 'string' ? nameChain.split('.') : nameChain;
    return get(this.stackInfoMap.resources, chain.join('._nestedResources.'));
  };

  #ensureMapResource = ({ nameChain }: { nameChain: string[] | string }) => {
    const chain = typeof nameChain === 'string' ? nameChain.split('.') : nameChain;
    if (!this.stackInfoMap.resources[chain[0]]) {
      this.stackInfoMap.resources[chain[0]] = this.#getEmptyMapResource({ topLevelParent: chain[0] });
    }
    return get(this.stackInfoMap.resources, chain.join('._nestedResources.'));
  };

  #getEmptyMapResource = ({ topLevelParent }: { topLevelParent: string }) => {
    const getMapResource = (resource: {
      type: StpResourceType | 'SHARED_GLOBAL' | 'CUSTOM_CLOUDFORMATION';
      _nestedResources?: StpResource['_nestedResources'];
    }): StackInfoMapResource => {
      return {
        resourceType: resource.type,
        cloudformationChildResources: {},
        referencableParams: {},
        links: {},
        outputs: {},
        _nestedResources:
          resource._nestedResources &&
          Object.entries(resource._nestedResources).reduce((acc, [nestedResourceIdentifier, nestedResource]) => {
            if (nestedResource) {
              acc[nestedResourceIdentifier] = getMapResource(nestedResource);
            }
            return acc;
          }, {})
      };
    };
    if (topLevelParent === PARENT_IDENTIFIER_SHARED_GLOBAL || topLevelParent === PARENT_IDENTIFIER_CUSTOM_CF) {
      return getMapResource({
        type: topLevelParent,
        _nestedResources:
          topLevelParent === PARENT_IDENTIFIER_SHARED_GLOBAL ? configManager.sharedGlobalNestedResources : undefined
      });
    }
    return getMapResource(configManager.findResourceInConfig({ nameChain: topLevelParent }).resource);
  };

  addUserCustomStackOutput = ({
    cloudformationOutputName,
    value,
    exportOutput,
    description
  }: {
    cloudformationOutputName: string;
    value: OutputValue;
    exportOutput?: boolean;
    description?: string;
  }) => {
    this.stackInfoMap.customOutputs[cloudformationOutputName] = value;
    templateManager.addStackOutput({ cfOutputName: cloudformationOutputName, value, exportOutput, description });
  };

  addCfChildResource = ({
    cfLogicalName,
    nameChain,
    resource,
    initial
  }: {
    cfLogicalName: string;
    resource: AnyCloudFormationResource;
    nameChain: string[] | string;
    initial?: boolean;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });
    if (parentResource.cloudformationChildResources[cfLogicalName]) {
      throw new Error(
        `Error when resolving. Child resource with cloudformation logical name "${cfLogicalName}" for parent "${nameChain}" is already in resource map.`
      );
    }
    parentResource.cloudformationChildResources[cfLogicalName] = {
      cloudformationResourceType: resource.Type as KnownCloudFormationResourceType
    };
    templateManager.addResource({ cfLogicalName, resource, initial });
  };

  addStacktapeResourceLink = ({
    nameChain,
    linkValue,
    linkName
  }: {
    nameChain: string[];
    linkName: string;
    linkValue: OutputValue;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });
    parentResource.links[kebabCase(linkName)] = linkValue;
  };

  addStackMetadata = ({
    metaName,
    metaValue,
    showDuringPrint
  }: {
    metaName: string;
    metaValue: OutputValue;
    showDuringPrint?: boolean;
  }) => {
    this.stackInfoMap.metadata[metaName] = {
      showDuringPrint: showDuringPrint !== false,
      value: metaValue
    };
  };

  addStacktapeResourceReferenceableParam = ({
    nameChain,
    paramName,
    paramValue,
    showDuringPrint,
    sensitive
  }: {
    nameChain: string[];
    paramName: StacktapeResourceReferenceableParam;
    paramValue: OutputValue;
    showDuringPrint?: boolean;
    sensitive?: boolean;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });

    parentResource.referencableParams[paramName] = {
      showDuringPrint: showDuringPrint !== false,
      value: paramValue,
      ssmParameterName: sensitive
        ? buildSSMParameterNameForReferencableParam({
            nameChain,
            paramName,
            stackName: this.context.stackName,
            region: this.context.region
          })
        : undefined
    };
  };

  addStacktapeResourceOutput = <T extends StpResourceType>({
    nameChain,
    output
  }: {
    nameChain: string[];
    output: Partial<StacktapeResourceOutput<T>>;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });
    parentResource.outputs = {
      ...parentResource.outputs,
      ...output
    };
  };

  getSubstitutedStackInfoMap = async (): Promise<Intrinsic> => {
    const substituteSensitiveValues = (resources: StackInfoMap['resources']): StackInfoMap['resources'] => {
      const resultResourceMap: StackInfoMap['resources'] = {};
      Object.entries(serialize(resources) as StackInfoMap['resources']).forEach(
        ([
          stpResourceName,
          { links, referencableParams, resourceType, cloudformationChildResources, outputs, _nestedResources }
        ]) => {
          resultResourceMap[stpResourceName] = {
            resourceType,
            referencableParams,
            links,
            cloudformationChildResources,
            outputs,
            _nestedResources: _nestedResources && substituteSensitiveValues(_nestedResources)
          } as StackInfoMapResource;
          // replacing sensitive values with placeholder
          Object.entries(resultResourceMap[stpResourceName].referencableParams).forEach(
            ([paramName, { ssmParameterName }]) => {
              if (ssmParameterName) {
                resultResourceMap[stpResourceName].referencableParams[paramName].value = '<<OMITTED>>';
              }
            }
          );
        }
      );
      return resultResourceMap;
    };

    // passing in the copy of this.stackInfoMap.resources to avoid overwriting sensitive values
    const substitutedResourcesMap = substituteSensitiveValues(serialize(this.stackInfoMap.resources));

    // resolving directives (including runtime)
    // we need to resolve them now in order to substitute nested cloudformation functions in the next step
    const resultObject: StackInfoMap = await configManager.resolveDirectives<StackInfoMap>({
      itemToResolve: {
        metadata: serialize(this.stackInfoMap.metadata),
        resources: substitutedResourcesMap,
        customOutputs: serialize(this.stackInfoMap.customOutputs)
      },
      resolveRuntime: true,
      useLocalResolve: false
    });
    // creating substituted object for Cloudformation to process
    return transformIntoCloudformationSubstitutedString(resultObject);
  };

  populateStackMetadata = async () => {
    this.addStackMetadata({
      metaName: stackMetadataNames.stackConsole(),
      metaValue: consoleLinks.stackUrl(this.context.region, this.context.stackName, 'resources'),
      showDuringPrint: true
    });

    this.addStackMetadata({
      metaName: stackMetadataNames.imageCount(),
      metaValue: `${configManager.allImagesCount}`,
      showDuringPrint: false
    });
    this.addStackMetadata({
      metaName: stackMetadataNames.functionCount(),
      metaValue: `${configManager.allLambdaResourcesCount}`,
      showDuringPrint: false
    });
    if (configManager.deploymentConfig?.cloudformationRoleArn) {
      this.addStackMetadata({
        metaName: stackMetadataNames.cloudformationRoleArn(),
        metaValue: configManager.deploymentConfig.cloudformationRoleArn,
        showDuringPrint: false
      });
    }

    // Store rollback safety metadata for future rollback operations
    const rollbackSafety = configManager.getRollbackSafetyInfo();
    this.addStackMetadata({
      metaName: stackMetadataNames.rollbackSafety(),
      metaValue: JSON.stringify(rollbackSafety),
      showDuringPrint: false
    });
    this.addStackMetadata({
      metaName: stackMetadataNames.emailSenderBindingsFingerprint(),
      metaValue: getEmailSenderBindingsFingerprint({
        resources: configManager.allResourcesIncludingNested,
        senders: configManager.emailSenders
      }),
      showDuringPrint: false
    });
    const retainedSharedResources = configManager.emailSenders
      .filter(({ manageIdentity }) => manageIdentity !== false)
      .map(({ identity }) => ({
        kind: 'email-identity' as const,
        identity,
        stackName: getSharedResourceStackName('email-identity', identity)
      }));
    if (retainedSharedResources.length) {
      this.addStackMetadata({
        metaName: stackMetadataNames.retainedSharedResources(),
        metaValue: JSON.stringify(retainedSharedResources),
        showDuringPrint: false
      });
    }
  };

  isCfResourceChildOfStpResource = ({
    stpResourceName,
    cfLogicalName
  }: {
    stpResourceName: string;
    cfLogicalName: string;
  }) => {
    return !!this.getChildResourceList({ stpResourceName })[cfLogicalName];
  };

  getChildResourceList = ({ stpResourceName }: { stpResourceName: string }) => {
    return getCloudformationChildResources({ resource: this.getStpResource({ nameChain: stpResourceName }) });
  };

  findStpParentNameOfCfResource = ({ cfLogicalName }: { cfLogicalName: string }) => {
    return Object.keys(this.stackInfoMap.resources).find((stpResourceName) =>
      this.isCfResourceChildOfStpResource({
        stpResourceName,
        cfLogicalName
      })
    );
  };
}

export const calculatedStackOverviewManager = compose(
  skipInitIfInitialized,
  cancelablePublicMethods
)(new CalculatedStackOverviewManager());
