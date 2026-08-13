import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import { resolveReferenceToAppSyncApi } from '@domain-services/config-manager/utils/appsync-apis';
import { templateManager } from '@domain-services/template-manager';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { AppSyncApiIntegration } from '@stacktape/config/events';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  getAppSyncDataSourceRole,
  getAppSyncLambdaDataSource,
  getAppSyncLambdaResolver
} from '../../../appsync-apis/utils';

export const resolveAppSyncApiEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  const events = (lambdaFunction.events || []).filter(
    (event): event is AppSyncApiIntegration => event.type === 'appsync-api'
  );
  const lambdaEndpointArn = lambdaFunction.aliasLogicalName
    ? ref(lambdaFunction.aliasLogicalName)
    : getAtt(lambdaFunction.cfLogicalName, 'Arn');
  const dataSourcesAdded = new Set<string>();

  events.forEach(({ properties }) => {
    const api = resolveReferenceToAppSyncApi({
      activeConfig: configManager,
      stpResourceReference: properties.appsyncApiName,
      referencedFrom: lambdaFunction.name,
      referencedFromType: 'function'
    });
    const dataSourceLogicalName = cfLogicalNames.appsyncApiDataSource({
      stpAppsyncApiName: api.name,
      stpLambdaFunctionName: lambdaFunction.name
    });
    if (!dataSourcesAdded.has(dataSourceLogicalName)) {
      dataSourcesAdded.add(dataSourceLogicalName);
      const roleLogicalName = cfLogicalNames.appsyncApiDataSourceRole({
        stpAppsyncApiName: api.name,
        stpLambdaFunctionName: lambdaFunction.name
      });
      if (!templateManager.getCfResourceFromTemplate(roleLogicalName)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: roleLogicalName,
          nameChain: api.nameChain,
          resource: getAppSyncDataSourceRole({ lambdaEndpointArn })
        });
      }
      if (!templateManager.getCfResourceFromTemplate(dataSourceLogicalName)) {
        const dataSource = getAppSyncLambdaDataSource({ api, lambdaEndpointArn, lambdaFunction });
        dataSource.DependsOn = roleLogicalName;
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: dataSourceLogicalName,
          nameChain: api.nameChain,
          resource: dataSource
        });
      }
    }

    const [typeName, fieldName] = properties.field.split('.') as [string, string];
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.appsyncApiResolver({
        fieldName,
        stpAppsyncApiName: api.name,
        typeName
      }),
      nameChain: api.nameChain,
      resource: getAppSyncLambdaResolver({ api, fieldName, lambdaFunction, typeName })
    });
  });

  return [];
};
