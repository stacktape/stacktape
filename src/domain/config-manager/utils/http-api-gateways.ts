import { stpErrors } from '@errors';
import { configManager } from '../index.js';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToHttpApiGateway = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  referencedFrom: string;
  referencedFromType?: StpWorkloadType | 'alarm';
  stpResourceReference: string;
}) => {
  // try {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'http-api-gateway',
    referencedFrom,
    referencedFromType
  });
  // } catch (err) {
  //   if ((err as StacktapeError).isExpected) {
  //     const resource = configManager.webServices
  //       .filter(({ _nestedResources: { httpApiGateway } }) => httpApiGateway)
  //       .find(({ name }) => name === stpResourceName)._nestedResources.httpApiGateway;
  //     if (!resource) {
  //       throw stpErrors.e36({
  //         stpResourceName,
  //         stpResourceType: 'http-api-gateway',
  //         referencedFrom,
  //         referencedFromType
  //       });
  //     }
  //     return resource;
  //   }
  // }
};

export const getDefaultHttpApiCorsAllowedMethods = ({ resource }: { resource: StpHttpApiGateway }): string[] => {
  const methods = new Set<string>();

  getAllIntegrationsForHttpApiGateway({ resource }).forEach((event) => {
    methods.add(event.properties.method);
  });

  return Array.from(methods).concat('OPTIONS');
};

export const getAllIntegrationsForHttpApiGateway = ({
  resource
}: {
  resource: StpHttpApiGateway;
}): (HttpApiIntegration & { workloadName: string })[] => {
  const result: (HttpApiIntegration & { workloadName: string })[] = [];
  configManager.allLambdasTriggerableUsingEvents.forEach(({ events, name }) => {
    if (events) {
      events.forEach((event) => {
        if (event.type === 'http-api-gateway' && event.properties.httpApiGatewayName === resource.nameChain.join('.')) {
          result.push({ ...event, workloadName: name });
        }
      });
    }
  });
  configManager.allContainerWorkloads.forEach(({ containers, name }) =>
    containers.forEach(({ events }) => {
      if (events) {
        events.forEach((event) => {
          if (
            event.type === 'http-api-gateway' &&
            event.properties.httpApiGatewayName === resource.nameChain.join('.')
          ) {
            result.push({ ...event, workloadName: name });
          }
        });
      }
    })
  );
  return result;
};

const validateHttpApiGatewayIntegrations = ({ resource }: { resource: StpHttpApiGateway }) => {
  const { name } = resource;
  const uniqueRouteKeys: { [uniqueRouteKey: string]: string } = {};
  getAllIntegrationsForHttpApiGateway({ resource }).forEach(({ workloadName, properties }) => {
    const uniqueKey = `${properties.path}-${properties.method}`;
    if (uniqueRouteKeys[uniqueKey]) {
      throw stpErrors.e92({
        stpHttpApiGatewayName: name,
        stpResourceName1: workloadName,
        stpResourceName2: uniqueRouteKeys[uniqueKey]
      });
    }
    uniqueRouteKeys[uniqueKey] = workloadName;
  });
};

export const validateHttpApiGatewayConfig = ({ resource }: { resource: StpHttpApiGateway }) => {
  validateHttpApiGatewayIntegrations({ resource });
};
