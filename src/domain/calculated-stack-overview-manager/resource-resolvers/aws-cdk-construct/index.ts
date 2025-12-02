import type { Stack as ImportedCdkStack } from 'aws-cdk-lib';
import type { Construct as ImportedCdkConstruct } from 'constructs';
import { dirname, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { stpErrors } from '@errors';
import { fsPaths } from '@shared/naming/fs-paths';
import { dynamicRequireLibraryFromUserNodeModules } from '@shared/utils/fs-utils';
import { capitalizeFirstLetter } from '@shared/utils/misc';
import { loadFromJavascript, loadFromTypescript } from '@utils/file-loaders';
import { parseUserCodeFilepath } from '@utils/user-code-processing';
import { readJsonSync } from 'fs-extra';

// eslint-disable-next-line ts/no-unused-vars
declare class CDKConstruct extends ImportedCdkStack {
  constructor(scope: ImportedCdkStack, id: string, props?: any);
}

export const resolveAwsCdkConstructs = async () => {
  await Promise.all(
    configManager.awsCdkConstructs.map(async (resource) => {
      const { filePath, extension } = parseUserCodeFilepath({
        fullPath: resource.entryfilePath,
        codeType: 'CONSTRUCT',
        workingDir: globalStateManager.workingDir
      });
      // find out if cdk libs (aws-cdk-lib + constructs) are available in folder of the construct
      // if yes, we will load them (to match exact aws-cdk-lib that user used for developing construct)
      // if no default libs (shipped with stacktape) are used
      const {
        cdkLib: { App, Stack },
        constructsLib: { Construct }
      } = getCdkLibs({ constructFilePath: resource.entryfilePath });
      // make dynamic require for user's cdk construct
      let UserConstructClass: typeof CDKConstruct;
      try {
        if (extension === 'js') {
          UserConstructClass = await loadFromJavascript({ filePath, exportName: resource.exportName });
        }
        if (extension === 'ts') {
          UserConstructClass = await loadFromTypescript({ filePath, exportName: resource.exportName });
        }
      } catch (err) {
        throw stpErrors.e70({
          constructName: resource.name,
          constructExportName: resource.exportName || 'default',
          constructFilePath: resource.entryfilePath,
          rootError: err
        });
      }

      const synthOutDir = fsPaths.absoluteAwsCdkConstructArtifactFolderPath({
        constructName: resource.name,
        invocationId: globalStateManager.invocationId
      });
      // instantiate app into which we will add construct
      const cdkApp = new App({
        outdir: synthOutDir
      });

      const { isConstruct, isStack } = getUserConstructClassInfo({
        UserConstructClass,
        ConstructClass: Construct,
        StackClass: Stack,
        constructResource: resource
      });

      if (!isConstruct) {
        throw stpErrors.e71({
          constructName: resource.name,
          constructExportName: resource.exportName || 'default',
          constructFilePath: resource.entryfilePath
        });
      }
      // we currently do not allow stack construct to be added as there are multiple questions/problems
      // 1. should we nest the stack or spread the resources? (overall adding entire stack can be sort of confusing to user)
      // 2. logical name of resources could overlap if multiple stack constructs instances are made (logical names do not include stack name - we would need to do custom renaming)
      // instead of adding "Stack" user can wrap resources in more generic construct - this way SDK will resolve resources and logical names correctly. Also IMO makes more sense to user.
      if (isStack) {
        throw stpErrors.e73({
          constructName: resource.name,
          constructClassName: UserConstructClass.name
        });
      }

      // synthesizing
      try {
        const stack = new Stack(cdkApp, 'stack');
        // eslint-disable-next-line no-new
        new UserConstructClass(stack, capitalizeFirstLetter(resource.name), resource.constructProperties);
        cdkApp.synth();
      } catch (err) {
        throw stpErrors.e72({ constructName: resource.name, rootError: err });
      }

      // after we successfully synthesized the construct we will parse the resulting template and add resources and outputs to our template
      const synthesizedTemplate: CloudformationTemplate = readJsonSync(join(synthOutDir, 'stack.template.json'));
      Object.entries(synthesizedTemplate.Resources).forEach(([cfLogicalName, cfResource]) => {
        // Some resources AWS CDK creates during synthesis are meant to be shared between constructs.
        // For example if you in CDK use [Bucket].enableEventBridgeNotification() then a "custom resource's" lambda/role/policy is created (BucketNotificationsHandlerXXX)
        // which is then used by "AWS::CloudFormation::CustomResource"(that is associated with specific bucket construct) to setup the proper event bridge notifications.
        // It makes no sense for CDK to create these CF resources (lambda/role/policy) more than once as they can be reused.
        // In normal circumstances, when synthesizing CDK, all constructs are synthesized into one template and CDK automatically adds reusable CF resources only once.
        // In our case, we are synthesizing each construct into separate template - which allows us to easily attribute specific CF resources
        // to specific stacktape aws-cdk-construct (in line with how we deal with other resources).
        // However, this means that re-usable CF resources are in each of the construct templates - but we only can/need to add it to final template once.
        // Therefore, when adding resource, we must first check if it is not already added - if so, we can skip adding it.
        // Reusable resource will be attributed to the first construct which adds it - however this should be no problem as these should be helper NO-COST resources.
        // We can revisit this approach if problems arise.
        if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
          calculatedStackOverviewManager.addCfChildResource({
            cfLogicalName,
            nameChain: resource.nameChain,
            resource: cfResource
          });
        }
      });
      Object.entries(synthesizedTemplate.Outputs || {}).forEach(([cfLogicalName, cfOutput]) => {
        calculatedStackOverviewManager.addUserCustomStackOutput({
          cloudformationOutputName: cfLogicalName,
          value: cfOutput.Value,
          description: String(cfOutput.Description),
          exportOutput: Boolean(cfOutput.Export)
        });
      });
    })
  );
};

const getCdkLibs = ({ constructFilePath }: { constructFilePath: string }) => {
  const constructDirectory = dirname(constructFilePath);
  try {
    return {
      cdkLib: dynamicRequireLibraryFromUserNodeModules({
        libraryName: 'aws-cdk-lib',
        searchFrom: constructDirectory
      }),
      constructsLib: dynamicRequireLibraryFromUserNodeModules({
        libraryName: 'constructs',
        searchFrom: constructDirectory
      })
    };
  } catch {
    throw stpErrors.e507({ missingLibs: ['aws-cdk-lib', 'construct'], feature: 'AWS CDK constructs' });
  }
};

const getUserConstructClassInfo = ({
  UserConstructClass,
  ConstructClass,
  StackClass,
  constructResource
}: {
  UserConstructClass: typeof CDKConstruct;
  ConstructClass: typeof ImportedCdkConstruct;
  StackClass: typeof ImportedCdkStack;
  constructResource: StpAwsCdkConstruct;
}) => {
  // now we need to instantiate the construct to actually validate if it is construct
  // instanceOf might not work here: see Construct.isConstruct method documentation
  try {
    const construct = new UserConstructClass(new StackClass(), 'dummy', constructResource.constructProperties);
    if (!ConstructClass.isConstruct(construct)) {
      return { isConstruct: false, isStack: false };
    }
    if (!StackClass.isStack(construct)) {
      return { isConstruct: true, isStack: false };
    }
    return { isConstruct: true, isStack: true };
  } catch (err) {
    throw stpErrors.e74({
      constructName: constructResource.name,
      constructExportName: constructResource.exportName || 'default',
      rootError: err
    });
  }
};
