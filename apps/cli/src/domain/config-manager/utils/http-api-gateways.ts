import type { StpHttpApiGateway } from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import type { ConfigManager } from '../index.js';
import { getPropsOfResourceReferencedInConfig } from './resource-lookup';
import type { HttpApiIntegration } from '@stacktape/config/events';
import { tuiManager } from '@application-services/tui-manager';
import { configErrors } from '../errors';

export const resolveReferenceToHttpApiGateway = ({
  activeConfig,
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  activeConfig: ConfigManager;
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
  //     const resource = activeConfig.webServices
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

export const getDefaultHttpApiCorsAllowedMethods = ({
  activeConfig,
  resource
}: {
  activeConfig: ConfigManager;
  resource: StpHttpApiGateway;
}): string[] => {
  const methods = new Set<string>();

  getAllIntegrationsForHttpApiGateway({ activeConfig: activeConfig, resource }).forEach((event) => {
    methods.add(event.properties.method);
  });

  return Array.from(methods).concat('OPTIONS');
};

export const getAllIntegrationsForHttpApiGateway = ({
  activeConfig,
  resource
}: {
  activeConfig: ConfigManager;
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

/**
 * Paths API Gateway answers itself on a custom domain name, without invoking the route: `GET /ping` returns 200
 * "Healthy Connection". Every HTTP API that Stacktape deploys has a custom domain, its own or the Stacktape default
 * domain. Only these exact root paths are reserved; `/api/ping` reaches its route.
 */
const PATHS_RESERVED_ON_CUSTOM_DOMAINS = ['/ping', '/sping'];

/** Warnings for routes of the HTTP API that requests through its domain never reach. */
export const getReservedHttpApiRouteWarnings = ({
  activeConfig,
  resource
}: {
  activeConfig: ConfigManager;
  resource: StpHttpApiGateway;
}): string[] =>
  getAllIntegrationsForHttpApiGateway({ activeConfig, resource })
    .filter(({ properties }) => PATHS_RESERVED_ON_CUSTOM_DOMAINS.includes(properties.path))
    .map(
      ({ workloadName, properties: { path, method } }) =>
        `Route \`${method} ${path}\` of \`${workloadName}\` on HTTP API \`${resource.name}\` is answered by API Gateway itself on custom domains, including the Stacktape domain, so requests never reach \`${workloadName}\`. Use another path, such as \`${path}-status\` or \`/health\`.`
    );

export const validateHttpApiGatewayConfig = ({
  activeConfig,
  resource
}: {
  activeConfig: ConfigManager;
  resource: StpHttpApiGateway;
}) => {
  validateHttpApiGatewayIntegrations({ activeConfig, resource });
  getReservedHttpApiRouteWarnings({ activeConfig, resource }).forEach((warning) => tuiManager.warn(warning));
};
