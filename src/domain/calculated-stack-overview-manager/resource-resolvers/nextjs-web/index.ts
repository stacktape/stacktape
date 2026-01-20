import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';

import { cfLogicalNames } from '@shared/naming/logical-names';

import { resolveBucket } from '../buckets';
import { resolveDynamoDbTable } from '../dynamo-db-tables';
import { resolveEdgeLambdaFunction } from '../edge-lambda-functions';
import { resolveFunction } from '../functions';
import { resolveSqsQueue } from '../sqs-queues';
import {
  getAssetReplacerResource,
  getAssetReplacerTemplateOverride,
  getCacheBehaviourTemplateOverride,
  getDistributionRootObjectTemplateOverride,
  getDynamoInsertCustomResource,
  getHostHeaderRewriteCloudfrontFunction
} from './utils';

export const resolveNextjsWebs = async () => {
  const nextjsWebs = filterResourcesForDevMode(configManager.nextjsWebs);
  nextjsWebs.forEach((nextjsWeb) => {
    const {
      _nestedResources: {
        bucket,
        imageFunction,
        revalidationFunction,
        revalidationQueue,
        serverEdgeFunction,
        serverFunction,
        warmerFunction,
        revalidationTable,
        revalidationInsertFunction
      }
    } = nextjsWeb;
    resolveBucket({ definition: bucket });
    resolveFunction({ lambdaProps: imageFunction });
    resolveFunction({ lambdaProps: revalidationFunction });
    resolveSqsQueue({ resource: revalidationQueue });
    resolveDynamoDbTable({ resource: revalidationTable });
    resolveFunction({ lambdaProps: revalidationInsertFunction });
    if (serverEdgeFunction) {
      resolveEdgeLambdaFunction({ lambdaProps: serverEdgeFunction });
    }
    if (serverFunction) {
      resolveFunction({ lambdaProps: serverFunction });
    }
    if (warmerFunction) {
      resolveFunction({ lambdaProps: warmerFunction });
    }

    // adding Cloudfront function since Cloudfront function is currently not supported as a first grade Stacktape resource
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.openNextHostHeaderRewriteFunction(nextjsWeb.name),
      nameChain: nextjsWeb.nameChain,
      resource: getHostHeaderRewriteCloudfrontFunction(nextjsWeb)
    });

    // adding asset replacer
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.openNextAssetReplacerCustomResource(nextjsWeb.name),
      nameChain: nextjsWeb.nameChain,
      resource: getAssetReplacerResource(nextjsWeb)
    });

    // adding dynamo db provider inserter
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.openNextDynamoInsertCustomResource(nextjsWeb.name),
      nameChain: nextjsWeb.nameChain,
      resource: getDynamoInsertCustomResource(nextjsWeb)
    });

    // all paths in public assets are NOT known before packaging (and not during config loading)
    // therefore the cache behaviors can only be set during template override
    templateManager.addFinalTemplateOverrideFn(getCacheBehaviourTemplateOverride(nextjsWeb));

    // artifact s3 key which needs asset replacement is NOT known before packaging
    // also injected environment variables (which asset replacer takes care of for edge lambda) are NOT known before all resolving is done
    templateManager.addFinalTemplateOverrideFn(getAssetReplacerTemplateOverride(nextjsWeb));

    // distribution default root object override
    templateManager.addFinalTemplateOverrideFn(getDistributionRootObjectTemplateOverride(nextjsWeb));

    const resource = calculatedStackOverviewManager.getStpResource({ nameChain: nextjsWeb.nameChain });
    const cdnResource = resource._nestedResources.serverFunction || resource._nestedResources.bucket;

    resource.referencableParams = {
      url: cdnResource.referencableParams.cdnCustomDomainUrls || cdnResource.referencableParams.cdnUrl
    };

    if (resource._nestedResources.serverEdgeFunction) {
      Object.entries(resource._nestedResources.serverEdgeFunction.links).forEach(([linkName, linkValue]) => {
        if (linkName.startsWith('logs')) {
          resource.links[`${linkName}-server`] = linkValue;
        }
      });
    } else {
      resource.links['logs-server'] = resource._nestedResources.serverFunction.links.logs;
    }
  });
};
