import type { AstroWeb } from '@stacktape/config/astro-web';
import type { BatchJob } from '@stacktape/config/batch-jobs';
import type { CustomResourceDefinition } from '@stacktape/config/custom-resources';
import type { DeploymentScript } from '@stacktape/config/deployment-script';
import type { LambdaFunction, LambdaFunctionProps } from '@stacktape/config/functions';
import type { NextjsWeb } from '@stacktape/config/nextjs-web';
import type { NuxtWeb } from '@stacktape/config/nuxt-web';
import type { LambdaRuntime } from '@stacktape/config/primitives';
import type { RemixWeb } from '@stacktape/config/remix-web';
import type { SolidStartWeb } from '@stacktape/config/solidstart-web';
import type { SvelteKitWeb } from '@stacktape/config/sveltekit-web';
import type { TanStackWeb } from '@stacktape/config/tanstack-web';

declare global {
type StpLambdaFunction = LambdaFunctionProps & {
  name: string;
  type: LambdaFunction['type'];
  configParentResourceType:
    | BatchJob['type']
    | LambdaFunction['type']
    | CustomResourceDefinition['type']
    | DeploymentScript['type']
    | NextjsWeb['type']
    | AstroWeb['type']
    | NuxtWeb['type']
    | SvelteKitWeb['type']
    | SolidStartWeb['type']
    | TanStackWeb['type']
    | RemixWeb['type'];
  nameChain: string[];
  handler: string;
  cfLogicalName: string;
  artifactName: string;
  resourceName: string;
  aliasLogicalName?: string;
};
type StpHelperLambdaFunction = Omit<StpLambdaFunction, 'packaging'> & {
  packaging: HelperLambdaPackaging;
  artifactPath: string;
  runtime: LambdaRuntime;
};
type FunctionReferencableParam = 'arn' | 'logGroupArn';
}
