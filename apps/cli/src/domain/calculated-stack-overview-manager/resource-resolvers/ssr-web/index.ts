import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { fsPaths } from '@shared/naming/fs-paths';
import { globalStateManager } from '@application-services/global-state-manager';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';
import { resolveBucket } from '../buckets';
import { resolveFunction } from '../functions';
import {
  getHostHeaderRewriteCloudfrontFunction,
  getDistributionRootObjectTemplateOverride,
  getStaticAssetsCacheBehaviorTemplateOverride,
  SSR_WEB_FRAMEWORK_CONFIGS,
  type SsrWebResourceType
} from '../_utils/ssr-web-shared';

type SsrWebResource = StpAstroWeb | StpNuxtWeb | StpSvelteKitWeb | StpSolidStartWeb | StpTanStackWeb | StpRemixWeb;

const resolveSsrWeb = (ssrWeb: SsrWebResource, resourceType: SsrWebResourceType) => {
  const { _nestedResources } = ssrWeb;
  const { bucket, serverFunction } = _nestedResources;
  const frameworkConfig = SSR_WEB_FRAMEWORK_CONFIGS[resourceType];

  resolveBucket({ definition: bucket });
  resolveFunction({ lambdaProps: serverFunction });

  // Add CloudFront function for host header rewrite
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.ssrWebHostHeaderRewriteFunction(ssrWeb.name, resourceType),
    nameChain: ssrWeb.nameChain,
    resource: getHostHeaderRewriteCloudfrontFunction(ssrWeb.name, (name, stackName, _region) =>
      awsResourceNames.ssrWebHostHeaderRewriteFunction(name, stackName, resourceType)
    )
  });

  // Add template override to set distribution root object to empty string
  templateManager.addFinalTemplateOverrideFn(getDistributionRootObjectTemplateOverride(serverFunction.name));

  // Add template override for static assets cache behaviors
  const buildPath = fsPaths.absoluteSsrWebBuiltProjectFolderPath({
    invocationId: globalStateManager.invocationId,
    stpResourceName: ssrWeb.name,
    resourceType
  });

  templateManager.addFinalTemplateOverrideFn(
    getStaticAssetsCacheBehaviorTemplateOverride({
      resourceName: serverFunction.name,
      assetsDirectoryPath: `${buildPath}/bucket-content`,
      staticPathPrefix: frameworkConfig.staticAssetPrefix
    })
  );

  // Set up referencable params and links
  const resource = calculatedStackOverviewManager.getStpResource({ nameChain: ssrWeb.nameChain });
  const cdnResource = resource._nestedResources.serverFunction;

  resource.referencableParams = {
    url: cdnResource.referencableParams.cdnCustomDomainUrls || cdnResource.referencableParams.cdnUrl
  };

  resource.links['logs-server'] = cdnResource.links.logs;
};

export const resolveAstroWebs = async () => {
  const astroWebs = filterResourcesForDevMode(configManager.astroWebs);
  astroWebs.forEach((astroWeb) => resolveSsrWeb(astroWeb, 'astro-web'));
};

export const resolveNuxtWebs = async () => {
  const nuxtWebs = filterResourcesForDevMode(configManager.nuxtWebs);
  nuxtWebs.forEach((nuxtWeb) => resolveSsrWeb(nuxtWeb, 'nuxt-web'));
};

export const resolveSvelteKitWebs = async () => {
  const sveltekitWebs = filterResourcesForDevMode(configManager.sveltekitWebs);
  sveltekitWebs.forEach((sveltekitWeb) => resolveSsrWeb(sveltekitWeb, 'sveltekit-web'));
};

export const resolveSolidStartWebs = async () => {
  const solidstartWebs = filterResourcesForDevMode(configManager.solidstartWebs);
  solidstartWebs.forEach((solidstartWeb) => resolveSsrWeb(solidstartWeb, 'solidstart-web'));
};

export const resolveTanStackWebs = async () => {
  const tanstackWebs = filterResourcesForDevMode(configManager.tanstackWebs);
  tanstackWebs.forEach((tanstackWeb) => resolveSsrWeb(tanstackWeb, 'tanstack-web'));
};

export const resolveRemixWebs = async () => {
  const remixWebs = filterResourcesForDevMode(configManager.remixWebs);
  remixWebs.forEach((remixWeb) => resolveSsrWeb(remixWeb, 'remix-web'));
};
