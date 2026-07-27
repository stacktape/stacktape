import type { GetConfigParams } from '@api/npm/ts/config';
import { globalStateManager } from '@application-services/global-state-manager';
import { getTypescriptExport } from '@utils/file-loaders';

export type CfResourceTransform = (props: Record<string, any>) => Partial<Record<string, any>>;
export type FinalTransform = (template: CloudformationTemplate) => CloudformationTemplate;

export class TransformsResolver {
  #transforms: { [logicalName: string]: CfResourceTransform } = {};
  #finalTransform: FinalTransform | null = null;

  /**
   * Checks if the config file is a TypeScript file with defineConfig-style default export.
   * Only this pattern supports transforms (uses TypeScript classes).
   */
  isDefineConfigStyle = (configFilePath: string): boolean => {
    // Must be a TypeScript file
    if (!configFilePath?.endsWith('.ts')) {
      return false;
    }

    try {
      const defaultExport = getTypescriptExport({
        filePath: configFilePath,
        cache: true,
        exportName: 'default'
      });

      // defineConfig returns a function
      return typeof defaultExport === 'function';
    } catch {
      return false;
    }
  };

  /**
   * The transforms are extracted from each resource definition in the config.
   * They are already keyed by CloudFormation logical names (transformed in the npm package).
   *
   * Only supports defineConfig pattern (default export).
   */
  loadTransforms = async (
    typescriptConfigFilePath: string
  ): Promise<{
    transforms: { [logicalName: string]: CfResourceTransform };
    finalTransform: FinalTransform | null;
  }> => {
    this.#transforms = {};
    this.#finalTransform = null;

    // Only process TypeScript config files
    if (!typescriptConfigFilePath?.endsWith('.ts')) {
      return { transforms: this.#transforms, finalTransform: this.#finalTransform };
    }

    try {
      // Load defineConfig pattern (default export)
      const defaultExport = getTypescriptExport({
        filePath: typescriptConfigFilePath,
        cache: false, // Don't cache to get fresh transforms
        exportName: 'default'
      });

      // Only defineConfig pattern supports transforms (uses TypeScript classes)
      if (!defaultExport || typeof defaultExport !== 'function') {
        return { transforms: this.#transforms, finalTransform: this.#finalTransform };
      }

      const configParams: GetConfigParams = {
        projectName: globalStateManager.targetStack?.projectName || globalStateManager.args.projectName,
        stage: globalStateManager.targetStack?.stage || globalStateManager.args.stage,
        region: globalStateManager.region,
        command: globalStateManager.command,
        awsProfile: globalStateManager.awsProfileName,
        user: {
          id: globalStateManager.userData?.id,
          name: globalStateManager.userData?.name,
          email: globalStateManager.userData?.email
        },
        cliArgs: globalStateManager.args
      };

      const config: StacktapeConfig = defaultExport(configParams);

      // Extract finalTransform if present
      if (typeof (config as any).finalTransform === 'function') {
        this.#finalTransform = (config as any).finalTransform;
      }

      if (!config?.resources) {
        return { transforms: this.#transforms, finalTransform: this.#finalTransform };
      }

      // Extract transforms from each resource
      this.extractTransformsFromResources(config.resources);
    } catch {
      // If loading fails, return empty transforms (config might be YAML or invalid)
      return { transforms: this.#transforms, finalTransform: this.#finalTransform };
    }

    return { transforms: this.#transforms, finalTransform: this.#finalTransform };
  };

  /**
   * Extracts transforms from resource definitions and populates the transforms map.
   * Each resource can have a `transforms` object with logical names as keys.
   */
  private extractTransformsFromResources(resources: StacktapeConfig['resources']): void {
    for (const resourceName in resources) {
      const resource = resources[resourceName] as Record<string, any>;

      // Skip if resource doesn't have transforms
      if (!resource?.transforms || typeof resource.transforms !== 'object') {
        continue;
      }

      const transforms = resource.transforms as Record<string, CfResourceTransform>;

      // Each key in transforms is already a CloudFormation logical name
      for (const logicalName in transforms) {
        const transformFn = transforms[logicalName];

        if (typeof transformFn === 'function') {
          this.#transforms[logicalName] = transformFn;
        }
      }
    }
  }
}
