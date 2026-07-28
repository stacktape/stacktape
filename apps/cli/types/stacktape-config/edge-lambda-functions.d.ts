type StpEdgeLambdaFunction = EdgeLambdaFunctionProps & {
  name: string;
  type: EdgeLambdaFunction['type'];
  configParentResourceType: EdgeLambdaFunction['type'] | NextjsWeb['type'];
  nameChain: string[];
  handler: string;
  artifactName: string;
  resourceName: string;
  architecture?: 'x86_64';
};
type StpHelperEdgeLambdaFunction = Omit<StpEdgeLambdaFunction, 'packaging'> & {
  packaging: HelperLambdaPackaging;
  artifactPath: string;
  runtime:
  | 'nodejs22.x'
  | 'nodejs20.x'
  | 'nodejs18.x'
  | 'python3.13'
  | 'python3.12'
  | 'python3.11'
  | 'python3.10'
  | 'python3.9'
  | 'python3.8';
};
type EdgeLambdaFunctionReferencableParam = 'arn';
