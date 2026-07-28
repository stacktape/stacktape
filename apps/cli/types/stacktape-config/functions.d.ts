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
