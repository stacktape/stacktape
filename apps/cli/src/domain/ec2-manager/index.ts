import type { _InstanceType, InstanceTypeInfo } from '@aws-sdk/client-ec2';
import type {
  DescribeInstanceTypeLimitsCommandOutput,
  OpenSearchPartitionInstanceType
} from '@aws-sdk/client-opensearch';
import { eventManager } from '@application-services/event-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';

export class EC2Manager {
  ec2InstanceTypes: InstanceTypeInfo[] = [];
  openSearchInstanceTypes: {
    [version: string]: { [instanceType: string]: DescribeInstanceTypeLimitsCommandOutput };
  } = {};

  init = async ({
    instanceTypes,
    openSearchInstanceTypes
  }: {
    instanceTypes: string[];
    openSearchInstanceTypes?: {
      version: string;
      instanceType: string;
    }[];
  }) => {
    if (instanceTypes?.length || openSearchInstanceTypes?.length) {
      await eventManager.startEvent({
        eventType: 'FETCH_EC2_INFO',
        description: 'Fetching EC2 info'
      });
      const [ec2InstanceTypes] = await Promise.all([
        instanceTypes.length &&
          awsSdkManager.getEc2InstanceTypesInfo({
            instanceTypes: instanceTypes as _InstanceType[]
          }),
        // awsSdkManager.setAwsAccountEcsSetting('awsvpcTrunking', 'enabled'),
        openSearchInstanceTypes &&
          Promise.all(
            openSearchInstanceTypes.map(async ({ version, instanceType }) => {
              if (!this.openSearchInstanceTypes[version]) {
                this.openSearchInstanceTypes[version] = {};
              }
              this.openSearchInstanceTypes[version][instanceType] = await awsSdkManager.getOpenSearchInstanceTypeLimits(
                {
                  openSearchVersion: version,
                  instanceType: instanceType as OpenSearchPartitionInstanceType
                }
              );
            })
          )
      ]);
      this.ec2InstanceTypes = ec2InstanceTypes;
      await eventManager.finishEvent({
        eventType: 'FETCH_EC2_INFO'
      });
    }
  };

  getInstanceWithLowestMemory = ({ instanceTypes }: { instanceTypes: string[] }) => {
    return this.ec2InstanceTypes
      .filter(({ InstanceType }) => instanceTypes.includes(InstanceType))
      .sort(({ MemoryInfo: { SizeInMiB: mem1 } }, { MemoryInfo: { SizeInMiB: mem2 } }) => mem1 - mem2)[0];
  };

  checkOpenSearchEbsSupport = ({ instanceTypesUsed, version }: { instanceTypesUsed: string[]; version: string }) => {
    if (!instanceTypesUsed.length) {
      return { gp3Supported: true, ebsSupported: true };
    }

    const versionInfo = this.openSearchInstanceTypes[version];
    if (!versionInfo) {
      return { gp3Supported: true, ebsSupported: true };
    }

    const missingInstanceType = instanceTypesUsed.some((instanceType) => !versionInfo[instanceType]);
    if (missingInstanceType) {
      return { gp3Supported: true, ebsSupported: true };
    }

    const instanceStorageLimits = instanceTypesUsed.map(
      (instanceType) => this.openSearchInstanceTypes[version][instanceType].LimitsByRole.data.StorageTypes
    );
    return {
      gp3Supported:
        instanceTypesUsed.length &&
        instanceStorageLimits.every((supportedStorageTypesForInstance) =>
          supportedStorageTypesForInstance.some(({ StorageSubTypeName }) => StorageSubTypeName === 'gp3')
        ),
      ebsSupported: instanceStorageLimits.every((supportedStorageTypesForInstance) =>
        supportedStorageTypesForInstance.some(({ StorageTypeName }) => StorageTypeName === 'ebs')
      )
    };
  };
}

export const ec2Manager = compose(skipInitIfInitialized, cancelablePublicMethods)(new EC2Manager());
