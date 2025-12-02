import type { TypeVersionSummary } from '@aws-sdk/client-cloudformation';
import type { Policy, RoleProperties } from '@cloudform/iam/role';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { S3Client } from '@aws-sdk/client-s3';
import { SUPPORTED_CF_INFRASTRUCTURE_MODULES } from '@config';
import { retryPlugin } from '@shared/aws/sdk-manager/utils';
import { cfRegistryNames } from '@shared/naming/cf-registry-types';
import { UNKNOWN_CLOUDFORMATION_PRIVATE_TYPE_VERSION_IDENTIFIER } from '@shared/utils/constants';
import { wait } from '@shared/utils/misc';
import { parseYaml } from '@shared/utils/yaml';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { loggingPlugin } from '@utils/aws-sdk-manager/utils';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { UnexpectedError } from '@utils/errors';
import { pRateLimit } from 'p-ratelimit';

export class CloudformationRegistryManager {
  stacktapeInfrastructureModulesStatus: {
    [_infrastructureModuleType in StpCfInfrastructureModuleType]?: {
      currentlyUsedPrivateCloudformationTypes: {
        [_privateTypeName in SupportedPrivateCfResourceType]?: { version: string };
      };
      newestCompatibleCloudformationPrivateTypeVersion: string;
      newestPrivateTypesSpecs: {
        [_privateTypeName in SupportedPrivateCfResourceType]?: {
          hasRoleFileAvailable?: boolean;
        };
      };
    };
  };

  cloudformationPrivateTypesInfo: {
    registeredCloudformationPrivateTypes: { [typeName: string]: TypeVersionSummary[] };
    availableCloudformationPrivateTypesFiles: {
      [_infrastructureModuleType in StpCfInfrastructureModuleType]: {
        [privateTypeMajorVersion: string]: { [privateTypeSubversion: string]: CloudformationPrivateTypeFile[] };
      };
    };
  } = {
    availableCloudformationPrivateTypesFiles: { atlasMongo: {}, upstashRedis: {}, ecsBlueGreen: {} },
    registeredCloudformationPrivateTypes: {}
  };

  init = async () => {};

  get privateTypePackagesS3Client() {
    const privateTypePackagesS3Client = new S3Client({
      region: globalStateManager.cloudformationRegistryBucketRegion,
      credentials: globalStateManager.credentials
    });
    privateTypePackagesS3Client.middlewareStack.use(loggingPlugin);
    privateTypePackagesS3Client.middlewareStack.use(retryPlugin);

    return privateTypePackagesS3Client;
  }

  get stacktapeInfrastructureModuleTypes(): StpCfInfrastructureModuleType[] {
    return Object.keys(SUPPORTED_CF_INFRASTRUCTURE_MODULES) as StpCfInfrastructureModuleType[];
  }

  loadPrivateTypesAndPackages = async (requiredModuleTypes: StpCfInfrastructureModuleType[]) => {
    requiredModuleTypes.forEach((infrastructureModuleType) => {
      this.checkCloudformationPrivateTypesController({ infrastructureModuleType });
    });
    await Promise.all([
      this.loadAvailableCloudformationPrivateTypePackages(),
      this.loadRegisteredCloudformationPrivateTypes()
    ]);
    requiredModuleTypes.forEach((infrastructureModuleType) => {
      this.determineModulePrivateTypesStatus({ infrastructureModuleType });
    });
  };

  loadAvailableCloudformationPrivateTypePackages = async () => {
    const availableModulePackages = await awsSdkManager.listAllObjectsInBucket(
      globalStateManager.cloudformationRegistryBucketName,
      this.privateTypePackagesS3Client
    );
    const { availableCloudformationPrivateTypesFiles } = this.cloudformationPrivateTypesInfo;
    availableModulePackages.forEach(({ Key }) => {
      const [infrastructureModuleType, privateTypesMajorVersion, privateTypeSubversion, fileName] = Key.split('/');
      if (
        !fileName ||
        privateTypeSubversion.length !== 7 ||
        !/^\d+$/.test(privateTypeSubversion) ||
        Number.isNaN(privateTypeSubversion)
      ) {
        // we are skipping keys that are only prefixes such as atlasMongo/ or atlasMongo/V1/ ...
        // we are also skipping shady subversions and shit
        // we are also skipping other files which are not zips
        // if role definition for resource type is needed, it should be in the same folder under name <<packageZipName_without_zip_extension>>-role.yml
        return;
      }
      if (!availableCloudformationPrivateTypesFiles[infrastructureModuleType]) {
        availableCloudformationPrivateTypesFiles[infrastructureModuleType] = {};
      }
      const cfPrivateTypeFiles = availableCloudformationPrivateTypesFiles[infrastructureModuleType];
      if (!cfPrivateTypeFiles[privateTypesMajorVersion]) {
        cfPrivateTypeFiles[privateTypesMajorVersion] = {};
      }
      if (!cfPrivateTypeFiles[privateTypesMajorVersion][privateTypeSubversion]) {
        cfPrivateTypeFiles[privateTypesMajorVersion][privateTypeSubversion] = [];
      }
      cfPrivateTypeFiles[privateTypesMajorVersion][privateTypeSubversion].push({ fileName });
    });
  };

  checkCloudformationPrivateTypesController = ({
    infrastructureModuleType
  }: {
    infrastructureModuleType: StpCfInfrastructureModuleType;
  }) => {
    const { privateTypesMajorVersionUsed, privateTypesMinimalRequiredSubversion, privateTypesSpecs, type } =
      SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType];
    if (
      privateTypesMinimalRequiredSubversion.length !== 7 ||
      Number.isNaN(Number(privateTypesMinimalRequiredSubversion))
    ) {
      throw new UnexpectedError({
        customMessage: `Static check of privateTypesMinimalRequiredSubversion of module ${type} failed. "${privateTypesMinimalRequiredSubversion}" is not a valid value.`
      });
    }
    const corruptedPrivateTypeName = Object.keys(privateTypesSpecs).find(
      (privateTypeName) => !privateTypeName.split('::')[1].endsWith(privateTypesMajorVersionUsed)
    );
    if (corruptedPrivateTypeName) {
      throw new UnexpectedError({
        customMessage: `Static check of private type "${corruptedPrivateTypeName}" in module ${type} failed. Private type name service name should end in privateTypesMajorVersionUsed (${privateTypesMajorVersionUsed})`
      });
    }
  };

  loadRegisteredCloudformationPrivateTypes = async () => {
    this.cloudformationPrivateTypesInfo.registeredCloudformationPrivateTypes =
      await awsSdkManager.listAllPrivateCloudformationResourceTypesWithVersions();
  };

  areMinimalRequirementsForModulePrivateTypesMet = ({
    infrastructureModuleType
  }: {
    infrastructureModuleType: StpCfInfrastructureModuleType;
  }) => {
    const requiredResourceTypes = SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType].privateTypesSpecs;
    const requiredMinimalSubversion =
      SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType].privateTypesMinimalRequiredSubversion;

    return Object.keys(requiredResourceTypes).every((privateTypeName) => {
      const currentlyUsedPrivateType =
        this.stacktapeInfrastructureModulesStatus[infrastructureModuleType].currentlyUsedPrivateCloudformationTypes[
          privateTypeName as SupportedPrivateCfResourceType
        ];
      const isReady =
        currentlyUsedPrivateType &&
        !Number.isNaN(Number(currentlyUsedPrivateType.version)) &&
        Number(currentlyUsedPrivateType.version) >= Number(requiredMinimalSubversion);
      return isReady;
    });
  };

  isUpdateForModulePrivateTypesAvailable = ({
    infrastructureModuleType
  }: {
    infrastructureModuleType: StpCfInfrastructureModuleType;
  }) => {
    return Object.entries(
      this.stacktapeInfrastructureModulesStatus[infrastructureModuleType].currentlyUsedPrivateCloudformationTypes
    ).some(([_privateTypeName, { version }]) => {
      return (
        Number(version) !==
        Number(
          this.stacktapeInfrastructureModulesStatus[infrastructureModuleType]
            .newestCompatibleCloudformationPrivateTypeVersion
        )
      );
    });
  };

  registerLatestCfPrivateTypes = async (requiredModuleTypes: StpCfInfrastructureModuleType[]) => {
    await this.loadPrivateTypesAndPackages(requiredModuleTypes);
    const modulesToRegister = requiredModuleTypes.filter(
      (moduleType) => !this.areMinimalRequirementsForModulePrivateTypesMet({ infrastructureModuleType: moduleType })
    );
    if (modulesToRegister.length) {
      await eventManager.startEvent({
        eventType: 'REGISTER_CF_PRIVATE_TYPES',
        description: 'Registering new cloudformation private types'
      });
      await Promise.all(
        modulesToRegister.map((moduleType) =>
          this.registerNewestAvailablePrivateTypes({ infrastructureModuleType: moduleType })
        )
      );
      await eventManager.finishEvent({
        eventType: 'REGISTER_CF_PRIVATE_TYPES'
      });
    }
  };

  resolveRoleForPrivateType = async ({
    infrastructureModuleType,
    privateTypeName,
    region
  }: // logGroupArn
  {
    infrastructureModuleType: StpCfInfrastructureModuleType;
    privateTypeName: SupportedPrivateCfResourceType;
    region: string;
    // logGroupArn: string;
  }): Promise<{ roleArn: string }> => {
    // downloading the file with role definition first
    const rawRoleDefinition = await awsSdkManager.getFromBucket({
      bucketName: globalStateManager.cloudformationRegistryBucketName,
      injectedS3Client: this.privateTypePackagesS3Client,
      s3Key: this.buildNewestAvailableFileBucketKeyForPrivateType({
        infrastructureModuleType,
        privateTypeName,
        fileType: 'roleDefinition'
      })
    });
    // parse the role definition file as yaml
    // the role is picked up from cloudformation template we have just parsed.
    // its logical name must be ExecutionRole
    const parsedRoleProperties: RoleProperties = parseYaml(rawRoleDefinition).Resources.ExecutionRole.Properties;
    // determine role name based on privateTypePackagePrefix and region
    const roleName = cfRegistryNames.buildRoleNameFromPackagePrefix({
      packagePrefix:
        SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType].privateTypesSpecs[
          privateTypeName as SupportedPrivateCfResourceType
        ].packagePrefix,
      region
    });
    let role = await awsSdkManager.getRole({
      roleName
    });
    // if there is no role yet, we will create it
    if (!role) {
      role = await awsSdkManager.createIamRole({
        roleName,
        assumeRolePolicyDocument: getAssumeRolePolicy({
          accountId: globalStateManager.targetAwsAccount.awsAccountId,
          region,
          resourceType: privateTypeName
        }),
        description: `Role generated by Stacktape to be assumed by private CF type ${privateTypeName}`,
        maxSessionDuration: parsedRoleProperties.MaxSessionDuration as number
      });
    }
    // finally adding modifying role inline policies
    await awsSdkManager.modifyInlinePoliciesForIamRole({
      roleName,
      desiredPolicies: parsedRoleProperties.Policies as Policy[]
      // only required if we decide to use logging
      // .concat({
      //   PolicyName: 'LogAndMetricPublish',
      //   PolicyDocument: {
      //     Version: '2012-10-17',
      //     Statement: [
      //       {
      //         Effect: 'Allow',
      //         Action: ['logs:PutLogEvents', 'logs:DescribeLogGroups', 'logs:DescribeLogStream', 'logs:CreateLogStream'],
      //         Resource: '*'
      //       },
      //       {
      //         Effect: 'Allow',
      //         Action: ['cloudwatch:ListMetrics', 'cloudwatch:PutMetricData'],
      //         Resource: '*'
      //       }
      //     ]
      //   }
      // })
    });

    return { roleArn: role.Arn };
  };

  resolveLogGroupForPrivateType = async ({
    infrastructureModuleType,
    privateTypeName
  }: {
    infrastructureModuleType: StpCfInfrastructureModuleType;
    privateTypeName: SupportedPrivateCfResourceType;
  }): Promise<{ logGroupArn: string; logGroupName: string }> => {
    const logGroupName = cfRegistryNames.buildLogGroupNameFromPackagePrefix({
      packagePrefix:
        SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType].privateTypesSpecs[
          privateTypeName as SupportedPrivateCfResourceType
        ].packagePrefix
    });
    let logGroup = await awsSdkManager.getLogGroup({ logGroupName });
    if (!logGroup) {
      logGroup = await awsSdkManager.createLogGroup({ logGroupName, retentionDays: 30 });
    }
    return {
      logGroupName: logGroup.logGroupName,
      // we need to remove last two characters of arn ":*". Otherwise the role which references arn will not work
      // https://www.repost.aws/questions/QUorG70C7OQl2Z9cMjMcwP6w/iam-policy-editor-warnings-specify-log-group-resource-arn-for-the-actions
      logGroupArn: logGroup.arn.slice(0, -2)
    };
  };

  buildNewestAvailableFileBucketKeyForPrivateType = ({
    infrastructureModuleType,
    privateTypeName,
    fileType
  }: {
    infrastructureModuleType: StpCfInfrastructureModuleType;
    privateTypeName: string;
    fileType: 'zipPackage' | 'roleDefinition';
  }) => {
    const fileName =
      fileType === 'zipPackage'
        ? cfRegistryNames.buildZipPackageNameFromPackagePrefix({
            packagePrefix:
              SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType].privateTypesSpecs[
                privateTypeName as SupportedPrivateCfResourceType
              ].packagePrefix
          })
        : cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({
            packagePrefix:
              SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType].privateTypesSpecs[
                privateTypeName as SupportedPrivateCfResourceType
              ].packagePrefix
          });
    return [
      infrastructureModuleType,
      SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType].privateTypesMajorVersionUsed,
      this.stacktapeInfrastructureModulesStatus[infrastructureModuleType]
        .newestCompatibleCloudformationPrivateTypeVersion,
      fileName
    ].join('/');
  };

  determineModulePrivateTypesStatus = ({
    infrastructureModuleType
  }: {
    infrastructureModuleType: StpCfInfrastructureModuleType;
  }) => {
    const statusDetail: {
      currentlyUsedPrivateCloudformationTypes: {
        [_privateTypeName in SupportedPrivateCfResourceType]?: { version: string };
      };
      newestCompatibleCloudformationPrivateTypeVersion: string;
      newestPrivateTypesSpecs: {
        [_privateTypeName in SupportedPrivateCfResourceType]?: {
          hasRoleFileAvailable?: boolean;
        };
      };
    } = {
      currentlyUsedPrivateCloudformationTypes: {},
      newestCompatibleCloudformationPrivateTypeVersion: UNKNOWN_CLOUDFORMATION_PRIVATE_TYPE_VERSION_IDENTIFIER,
      newestPrivateTypesSpecs: {}
    };
    const { registeredCloudformationPrivateTypes, availableCloudformationPrivateTypesFiles } =
      this.cloudformationPrivateTypesInfo;

    const { privateTypesMajorVersionUsed, privateTypesMinimalRequiredSubversion, privateTypesSpecs, type } =
      SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType];
    // test private types
    // FIRST we are SETTING/DETERMINING values we will need later on
    // be aware every subversion in your module bucket MUST CONTAIN ALL OFF THE private types used by module
    const sortedPrivateTypesAvailableSubversion = Object.keys(
      availableCloudformationPrivateTypesFiles[type]?.[privateTypesMajorVersionUsed] || {}
    ).sort((a, b) => Number(b) - Number(a));
    const privateTypesUsedByModule = Object.keys(privateTypesSpecs);

    // set info about modules to unknown values (we will figure them out later)
    privateTypesUsedByModule.forEach((privateTypeName) => {
      statusDetail.currentlyUsedPrivateCloudformationTypes[privateTypeName] = {
        version: UNKNOWN_CLOUDFORMATION_PRIVATE_TYPE_VERSION_IDENTIFIER
      };
    });

    // SECOND we are checking registered private types that are currently in use
    // we will also check if they are all in the same version:
    // - they either should be in same version
    // - OR some of the private types which were introduced later can be "unknown"
    Object.keys(registeredCloudformationPrivateTypes)
      .filter((registeredPrivateTypeName) => privateTypesUsedByModule.includes(registeredPrivateTypeName))
      .forEach((relevantPrivateType) => {
        const privateTypeVersionInUse = registeredCloudformationPrivateTypes[relevantPrivateType].find(
          ({ IsDefaultVersion }) => IsDefaultVersion
        );
        statusDetail.currentlyUsedPrivateCloudformationTypes[relevantPrivateType].version =
          privateTypeVersionInUse?.Description || UNKNOWN_CLOUDFORMATION_PRIVATE_TYPE_VERSION_IDENTIFIER;
      });

    // THIRD we are checking if the newest available subversion contains all of the required zips
    // if it does not then this subversion release is corrupted - therefore we will check previous release
    // we will do this until we find a release with all relevant zip files or we are below "privateTypesMinimalRequiredSubversion"
    // when we are UNABLE to find a release that satisfy this stacktape version we are in a corrupted state and error should be thrown
    // we should never reach corrupted state
    const newestCompatiblePrivateTypesVersion = sortedPrivateTypesAvailableSubversion.find((subversion) => {
      if (Number(subversion) < Number(privateTypesMinimalRequiredSubversion)) {
        // if we have gotten here, we are in trouble. see above ^^^^^^
        throw new UnexpectedError({
          customMessage: `No valid infrastructure private types for module ${type} ${privateTypesMajorVersionUsed} satisfying minimal required subversion (${privateTypesMinimalRequiredSubversion}) that can be used with this Stacktape version could were found.`
        });
      }
      // For correct operation of this module stacktape needs private types defined in "privateTypesSpecs"
      // following loop will check if this "subversion" release contains all of those private types
      let hasAllRequiredZips = true;
      Object.values(privateTypesSpecs).forEach(({ packagePrefix }) => {
        if (
          !availableCloudformationPrivateTypesFiles[type]?.[privateTypesMajorVersionUsed]?.[subversion]?.some(
            ({ fileName }) => fileName === cfRegistryNames.buildZipPackageNameFromPackagePrefix({ packagePrefix })
          )
        ) {
          hasAllRequiredZips = false;
        }
      });
      return hasAllRequiredZips;
    });

    if (!newestCompatiblePrivateTypesVersion) {
      // if this block gets executed, we are in trouble
      // it means we went through all the private types subversions and were not able to find any compatible with this stacktape version
      // this should never happen
      throw new UnexpectedError({
        customMessage: `No valid infrastructure private types for module ${type} ${privateTypesMajorVersionUsed} satisfying minimal required subversion (${privateTypesMinimalRequiredSubversion}) that can be used with this Stacktape version were found.`
      });
    }
    statusDetail.newestCompatibleCloudformationPrivateTypeVersion = newestCompatiblePrivateTypesVersion;

    // now we will look at newest available subversion folder and set some other specs
    // currently we are only looking if the role file is present for the module
    // if the role file is available we are setting statusDetail.newestPrivateTypesSpecs[<<type_name>>].hasRoleFileAvailable to true
    Object.entries(privateTypesSpecs).forEach(([privateTypeName, { packagePrefix }]) => {
      statusDetail.newestPrivateTypesSpecs[privateTypeName as SupportedPrivateCfResourceType] = {};
      if (
        availableCloudformationPrivateTypesFiles[type]?.[privateTypesMajorVersionUsed]?.[
          newestCompatiblePrivateTypesVersion
        ]?.some(
          ({ fileName }) => fileName === cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({ packagePrefix })
        )
      ) {
        statusDetail.newestPrivateTypesSpecs[privateTypeName as SupportedPrivateCfResourceType].hasRoleFileAvailable =
          true;
      }
    });

    // at last we are saving the status
    this.stacktapeInfrastructureModulesStatus = {
      ...(this.stacktapeInfrastructureModulesStatus || {}),
      [type]: statusDetail
    };
  };

  registerNewestAvailablePrivateTypes = async ({
    infrastructureModuleType
  }: {
    infrastructureModuleType: StpCfInfrastructureModuleType;
  }) => {
    // if (this.areMinimalRequirementsForModulePrivateTypesMet({ infrastructureModuleType })) {
    //   return;
    // }
    // we need to have global limit function for all module registration
    // this ensures that the amount of request sent to cloudformation API is limited
    // otherwise rate exceeded error occurs https://stacktape-workspace.slack.com/archives/DS4KBQ29X/p1626262120000100
    const limit = pRateLimit({
      interval: 2000, // 1s
      rate: 1, // 1 API calls per interval
      concurrency: 2, // no more than 2 running at once
      maxDelay: 60000 // an API call delayed > 60 sec is rejected
    });
    return Promise.all(
      Object.keys(SUPPORTED_CF_INFRASTRUCTURE_MODULES[infrastructureModuleType].privateTypesSpecs).map(
        async (privateTypeName) => {
          // we are first checking if this private type has role available
          // if it does we will create/update the role for the resource first and then pass this role further down
          const region = globalStateManager.region;
          // const { logGroupName } = await this.resolveLogGroupForPrivateType({
          //   infrastructureModuleType,
          //   privateTypeName: privateTypeName as SupportedPrivateCfResourceType
          // });
          let roleArn: string;
          if (
            this.stacktapeInfrastructureModulesStatus[infrastructureModuleType].newestPrivateTypesSpecs[
              privateTypeName as SupportedPrivateCfResourceType
            ].hasRoleFileAvailable
          ) {
            // printer.info(`Resolving role for private type ${privateTypeName} ...`);
            ({ roleArn } = await this.resolveRoleForPrivateType({
              infrastructureModuleType,
              privateTypeName: privateTypeName as SupportedPrivateCfResourceType,
              region
              // logGroupArn
            }));
            // printer.info(`Resolved role for private type ${privateTypeName}.`);
          }
          // we are putting some random jitter before function calls to avoid rate exceeded error
          // printer.info(`Registering private type ${privateTypeName} ...`);
          await wait(Math.random() * 500);
          const typeVersionArn = await awsSdkManager.registerPrivateCloudformationResourceType({
            schemaHandlerPackageS3Url: `s3://${
              globalStateManager.cloudformationRegistryBucketName
            }/${this.buildNewestAvailableFileBucketKeyForPrivateType({
              infrastructureModuleType,
              privateTypeName,
              fileType: 'zipPackage'
            })}`,
            typeName: privateTypeName,
            executionRoleArn: roleArn,
            // logGroupName,
            // we are passing rate limiter that globally limits amount of request for cloudformation Api
            // see also comments on top of function
            rateLimiter: limit
          });
          // printer.info(
          //   `Registered private type ${privateTypeName} at version ${this.stacktapeInfrastructureModulesStatus[infrastructureModuleType].newestCompatibleCloudformationPrivateTypeVersion}(newest available)`
          // );
          await awsSdkManager.setPrivateCloudformationResourceTypeAsDefault({
            typeVersionArn,
            // we are passing rate limiter that globally limits amount of request for cloudformation Api
            // see also comments on top of function
            rateLimiter: limit
          });
          // printer.info(
          //   `Private type's ${privateTypeName} default version set at ${this.stacktapeInfrastructureModulesStatus[infrastructureModuleType].newestCompatibleCloudformationPrivateTypeVersion}(newest available)`
          // );
          await wait(300);
          if (this.cloudformationPrivateTypesInfo.registeredCloudformationPrivateTypes[privateTypeName]) {
            await Promise.all(
              this.cloudformationPrivateTypesInfo.registeredCloudformationPrivateTypes[privateTypeName].map(
                async ({ Arn }) =>
                  awsSdkManager.deregisterPrivateCloudformationType({
                    typeVersionArn: Arn,
                    // we are passing rate limiter that globally limits amount of request for cloudformation Api
                    // see also comments on top of function
                    rateLimiter: limit
                  })
              )
            );
            // printer.info(`Deregistered old versions for private type ${privateTypeName}`);
          }
        }
      )
    );
  };
}

const getAssumeRolePolicy = ({
  accountId,
  region,
  resourceType
}: {
  accountId: string;
  region: string;
  resourceType: SupportedPrivateCfResourceType;
}) => ({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { Service: 'resources.cloudformation.amazonaws.com' },
      Action: 'sts:AssumeRole',
      Condition: {
        StringEquals: { 'aws:SourceAccount': accountId },
        StringLike: {
          'aws:SourceArn': `arn:aws:cloudformation:${region}:${accountId}:type/resource/${resourceType.replaceAll(
            '::',
            '-'
          )}/*`
        }
      }
    }
  ]
});

export const cloudformationRegistryManager = compose(
  skipInitIfInitialized,
  cancelablePublicMethods
)(new CloudformationRegistryManager());
