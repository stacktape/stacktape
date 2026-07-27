import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { processAllNodes } from '@shared/utils/misc';
import { escapeCloudformationSecretDynamicReference } from '@utils/stack-info-map-sensitive-values';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const resolveSensitiveDataCustomResource = () => {
  const cfLogicalName = cfLogicalNames.customResourceSensitiveData();
  calculatedStackOverviewManager.addCfChildResource({
    resource: getStpServiceCustomResource<'sensitiveData'>({
      sensitiveData: []
    }),
    cfLogicalName,
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
  });
  templateManager.addFinalTemplateOverrideFn(async (template) => {
    // here we are collecting sensitive data from resources referencable params
    // in future we can collect sensitive data from other places if desired
    const sensitiveDataWithDirectivesToResolve = Object.values(calculatedStackOverviewManager.stackInfoMap.resources)
      .map(({ referencableParams }) =>
        Object.values(referencableParams || {})
          .filter(({ ssmParameterName }) => ssmParameterName)
          .map(({ value, ssmParameterName }) => ({
            value,
            ssmParameterName
          }))
      )
      .flat();

    const sensitiveDataWithResolvedDirectives = await configManager.resolveDirectives<
      StpServiceCustomResourceProperties['sensitiveData']
    >({ itemToResolve: sensitiveDataWithDirectivesToResolve, resolveRuntime: true });

    const sensitiveDataWithEscapedReferences = await Promise.all(
      sensitiveDataWithResolvedDirectives.map(async ({ ssmParameterName, value }) => {
        return {
          ssmParameterName,
          value: await processAllNodes(value, escapeCloudformationSecretDynamicReference)
        };
      })
    );

    (template.Resources[cfLogicalName].Properties as StpServiceCustomResourceProperties).sensitiveData =
      sensitiveDataWithEscapedReferences;
  });
};
