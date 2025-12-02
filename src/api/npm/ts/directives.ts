/**
 * Returns a reference to a resource parameter.
 * @param resourceName - The name of the resource as specified in the Stacktape config.
 * @param property - The property of the resource. The list of properties is available in the Stacktape docs for every given resource type.
 */
export const $ResourceParam = (resourceName: string, property: string) => {
  return `$ResourceParam('${resourceName}','${property}')`;
};

/**
 * Returns a reference to a CloudFormation resource parameter.
 * @param cloudformationResourceLogicalId - The logical name of the Cloudformation resource.
 * If you are referencing a resource defined in the cloudformationResources section, use its name.
 * To reference a child resource of a Stacktape resource, you can get a list of child resources with the `stacktape stack-info` command
 * @param property - The parameter of the Cloudformation resource to reference.
 * For a list of all referenceable parameters, refer to the [Referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters#parameters-of-cloudformation-resources) section in the Stacktape docs.
 */
export const $CfResourceParam = (cloudformationResourceLogicalId: string, property: string) => {
  return `$CfResourceParam('${cloudformationResourceLogicalId}','${property}')`;
};

/**
 * Returns a reference to a secret.
 * @param secretName - The name of the secret. Must be a valid secret name in the AWS Secrets Manager in the region you're deploying to.
 * If the secret is in JSON format, you can extract nested properties using dot notation.
 * Example: `$Secret('my-secret.api-key')` will return the value of the `api-key` property in the `my-secret` secret.
 */
export const $Secret = (secretName: string) => {
  return `$Secret('${secretName}')`;
};

/**
 * Returns an interpolated string. Unlike the $Format() directive, the $CfFormat() directive can contain runtime-resolved directives as arguments.
 * @param interpolatedString - Occurrences of {} are replaced by the subsequent arguments.
 * @param values - The number of values must be equal to the number of {} placeholders in the first argument.
 * Example:
 * `$CfFormat('{}-{}', 'foo', 'bar')` results in `foo-bar`.
 * $CfFormat('{}-mydomain.com', 'foo') results in foo-mydomain.com.
 * `$CfFormat('{}.mydomain.com', $Stage())` results in `staging.mydomain.com` if the stage is staging.
 */
export const $CfFormat = (interpolatedString: string, ...values: any[]) => {
  return `$CfFormat('${interpolatedString}', '${values.join(',')}')`;
};

/**
 * Returns the output of another stack, allowing you to reference resources deployed in another stack. The referenced stack must already be deployed. If you try to delete a stack that is referenced by another stack, you will get an error.
 * To get the output locally (i.e., download the value and pass it to the configuration), use the $StackOutput() directive.
 * @param stackName - The name of the stack.
 * @param outputName - The name of the output.
 */
export const $CfStackOutput = (stackName: string, outputName: string) => {
  return `$CfStackOutput('${stackName}','${outputName}')`;
};

/**
 * Returns information about the current Git repository.
 *
 * $GitInfo().sha1 - SHA-1 of the latest commit
 *
 * $GitInfo().commit - The latest commit ID
 *
 * $GitInfo().branch - The name of the current branch
 *
 * $GitInfo().message - The message of the last commit
 *
 * $GitInfo().user - Git user's name
 *
 * $GitInfo().email - Git user's email
 *
 * $GitInfo().repository - The name of the git repository
 *
 * $GitInfo().tags - The tags pointing to the current commit
 *
 * $GitInfo().describe - The most recent tag that is reachable from a commit
 */
export const $GitInfo = () => {
  return '$GitInfo()';
};
