import type { PricingInfo, RegionalPricingInfo } from '@shared/aws/pricing-info';
import { join } from 'node:path';
import { ALLOWED_MEMORY_VALUES_FOR_CPU } from '@shared/aws/fargate';
import { calculateFlatMonthlyCost, downloadSimplePricingInfo } from '@shared/aws/pricing-info';
import { AWS_PRICE_INFO_GENERATED_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { outputFile } from 'fs-extra';

export const generateAwsPricingJson = async () => {
  const result: {
    [productType: string]: {
      instanceType?: string;
      vCpu?: string;
      memory?: string;
      label: string;
      additionalMessage?: string;
      monthlyCost: number;
    }[];
  } = {
    rdsInstances: [],
    fargateCpu: [],
    fargateMemory: [],
    elasticacheInstances: [],
    auroraInstances: [],
    ec2Instances: []
  };

  const [rdsPriceInfo, ecsPriceInfo, elasticachePriceInfo, ec2PriceInfo] = await Promise.all([
    downloadSimplePricingInfo({ downloadDirectory: '/tmp', awsServiceOfferCode: 'AmazonRDS' }),
    downloadSimplePricingInfo({ downloadDirectory: '/tmp', awsServiceOfferCode: 'AmazonECS' }),
    downloadSimplePricingInfo({ downloadDirectory: '/tmp', awsServiceOfferCode: 'AmazonElastiCache' }),
    downloadSimplePricingInfo({ downloadDirectory: '/tmp', awsServiceOfferCode: 'AmazonEC2' })
  ]);

  const getAnyRegionProductPrice = (productPriceInfo: PricingInfo[string]): RegionalPricingInfo => {
    const productPriceInfoKeys = Object.keys(productPriceInfo);
    return productPriceInfo['us-east-1'] || productPriceInfo[productPriceInfoKeys[0]];
  };

  Object.entries(ec2PriceInfo).forEach(([productName, product]) => {
    if (productName.startsWith('EC2-instance-') && productName.endsWith('Linux')) {
      const instanceType = productName.split('-').at(2);
      const regionalProductPrice = getAnyRegionProductPrice(product);
      if (regionalProductPrice.ADDITIONAL_METADATA.cpuArchitecture === 'x86') {
        result.ec2Instances.push({
          label: instanceType,
          additionalMessage: `vCpu: ${regionalProductPrice.ADDITIONAL_METADATA.vCpu}, memory: ${regionalProductPrice.ADDITIONAL_METADATA.memory}`,
          instanceType,
          vCpu: regionalProductPrice.ADDITIONAL_METADATA.vCpu,
          memory: regionalProductPrice.ADDITIONAL_METADATA.memory,
          monthlyCost: calculateFlatMonthlyCost(regionalProductPrice)
        });
      }
    }
  });

  Object.entries(rdsPriceInfo).forEach(([productName, product]) => {
    if (productName.startsWith('RDS-instance-') && productName.endsWith('postgres')) {
      const instanceType = productName.split('-').at(2);
      const regionalProductPrice = getAnyRegionProductPrice(product);
      result.rdsInstances.push({
        label: instanceType,
        additionalMessage: `vCpu: ${regionalProductPrice.ADDITIONAL_METADATA.vCpu}, memory: ${regionalProductPrice.ADDITIONAL_METADATA.memory}`,
        instanceType,
        vCpu: regionalProductPrice.ADDITIONAL_METADATA.vCpu,
        memory: regionalProductPrice.ADDITIONAL_METADATA.memory,
        monthlyCost: calculateFlatMonthlyCost(regionalProductPrice)
      });
    }
    if (productName.startsWith('RDS-instance-') && productName.endsWith('aurora-postgresql')) {
      const instanceType = productName.split('-').at(2);
      const regionalProductPrice = getAnyRegionProductPrice(product);
      result.auroraInstances.push({
        label: instanceType,
        additionalMessage: `vCpu: ${regionalProductPrice.ADDITIONAL_METADATA.vCpu}, memory: ${regionalProductPrice.ADDITIONAL_METADATA.memory}`,
        instanceType,
        vCpu: regionalProductPrice.ADDITIONAL_METADATA.vCpu,
        memory: regionalProductPrice.ADDITIONAL_METADATA.memory,
        monthlyCost: calculateFlatMonthlyCost(regionalProductPrice)
      });
    }
  });

  Object.entries(elasticachePriceInfo).forEach(([productName, product]) => {
    if (productName.startsWith('ElastiCache-instance')) {
      const instanceType = productName.split('-').at(2);
      const regionalProductPrice = getAnyRegionProductPrice(product);
      result.elasticacheInstances.push({
        label: instanceType,
        additionalMessage: `vCpu: ${regionalProductPrice.ADDITIONAL_METADATA.vCpu}, memory: ${regionalProductPrice.ADDITIONAL_METADATA.memory}`,
        instanceType,
        vCpu: regionalProductPrice.ADDITIONAL_METADATA.vCpu,
        memory: regionalProductPrice.ADDITIONAL_METADATA.memory,
        monthlyCost: calculateFlatMonthlyCost(regionalProductPrice)
      });
    }
  });

  const allPossibleFargateCpuValues = Object.keys(ALLOWED_MEMORY_VALUES_FOR_CPU);
  const allPossibleFargateMemoryValues = Array.from(new Set(Object.values(ALLOWED_MEMORY_VALUES_FOR_CPU).flat()));

  Object.entries(ecsPriceInfo).forEach(([productName, product]) => {
    const regionalProductPrice = getAnyRegionProductPrice(product);
    if (productName.startsWith('ECS-cpu-AMD64-Linux')) {
      allPossibleFargateCpuValues.forEach((cpuVal) => {
        result.fargateCpu.push({
          label: cpuVal,

          vCpu: cpuVal,
          monthlyCost: calculateFlatMonthlyCost(regionalProductPrice) * Number(cpuVal)
        });
      });
    }
    if (productName.startsWith('ECS-memory-AMD64-Linux')) {
      allPossibleFargateMemoryValues.forEach((memVal) => {
        result.fargateMemory.push({
          label: `${memVal} MB`,
          memory: String(memVal),
          monthlyCost: calculateFlatMonthlyCost(regionalProductPrice) * (memVal / 1024)
        });
      });
    }
  });
  result.ec2Instances.sort(({ monthlyCost }, { monthlyCost: monthlyCost2 }) => monthlyCost - monthlyCost2);
  result.rdsInstances.sort(({ monthlyCost }, { monthlyCost: monthlyCost2 }) => monthlyCost - monthlyCost2);
  result.elasticacheInstances.sort(({ monthlyCost }, { monthlyCost: monthlyCost2 }) => monthlyCost - monthlyCost2);
  return result;
};

const generateAwsPricingJsonFile = async () => {
  logInfo('Generating pricing info...');
  const result = await generateAwsPricingJson();
  await outputFile(join(AWS_PRICE_INFO_GENERATED_FOLDER_PATH, 'prices.json'), JSON.stringify(result));
  logSuccess('Price info generated successfully.');
};

if (import.meta.main) {
  generateAwsPricingJsonFile();
}
