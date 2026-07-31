import type { StpHttpApiGateway } from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import { configManager as runtimeConfigManager, type ConfigManager } from '../index.js';
import { getPropsOfResourceReferencedInConfig } from './resource-references';
import type { HttpApiIntegration } from '@stacktape/config/events';
import { configErrors } from '../errors';

export const resolveReferenceToHttpApiGateway = ({
  activeConfig = runtimeConfigManager,
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  activeConfig?: ConfigManager;
  referencedFrom: string;
  referencedFromType?: StpWorkloadType | 'alarm';
  stpResourceReference: string;
}) => {
  // try {
  return getPropsOfResourceReferencedInConfig({
    activeConfig,
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
  //       throw configErrors.unresolvedResourceReference({
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
  activeConfig = runtimeConfigManager,
  resource
}: {
  activeConfig?: ConfigManager;
  resource: StpHttpApiGateway;
}): (HttpApiIntegration & { workloadName: string })[] => {
  const result: (HttpApiIntegration & { workloadName: string })[] = [];
  activeConfig.allLambdasTriggerableUsingEvents.forEach(({ events, name }) => {
    if (events) {
      events.forEach((event) => {
        if (event.type === 'http-api-gateway' && event.properties.httpApiGatewayName === resource.nameChain.join('.')) {
          result.push({ ...event, workloadName: name });
        }
      });
    }
  });
  activeConfig.allContainerWorkloads.forEach(({ containers, name }) =>
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

const validateHttpApiGatewayIntegrations = ({
  activeConfig,
  resource
}: {
  activeConfig: ConfigManager;
  resource: StpHttpApiGateway;
}) => {
  const { name } = resource;
  const uniqueRouteKeys: { [uniqueRouteKey: string]: string } = {};
  getAllIntegrationsForHttpApiGateway({ activeConfig, resource }).forEach(({ workloadName, properties }) => {
    const uniqueKey = `${properties.path}-${properties.method}`;
    if (uniqueRouteKeys[uniqueKey]) {
      throw configErrors.httpApiRouteConflict({
        stpHttpApiGatewayName: name,
        stpResourceName1: workloadName,
        stpResourceName2: uniqueRouteKeys[uniqueKey]
      });
    }
    uniqueRouteKeys[uniqueKey] = workloadName;
  });
};

export const validateHttpApiGatewayConfig = ({
  activeConfig,
  resource
}: {
  activeConfig: ConfigManager;
  resource: StpHttpApiGateway;
}) => {
  validateHttpApiGatewayIntegrations({ activeConfig, resource });
};
