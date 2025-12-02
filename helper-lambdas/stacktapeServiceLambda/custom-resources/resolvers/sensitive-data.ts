import {
  AddTagsToResourceCommand,
  DeleteParametersCommand,
  ParameterType,
  PutParameterCommand,
  ResourceTypeForTagging,
  SSMClient
} from '@aws-sdk/client-ssm';
import { tagNames } from '@shared/naming/tag-names';
import { chunkArray } from '@shared/utils/misc';
import { pRateLimit } from 'p-ratelimit';

export const sensitiveData: ServiceLambdaResolver<StpServiceCustomResourceProperties['sensitiveData']> = async (
  currentProps,
  previousProps,
  operation
) => {
  const ssmClient = new SSMClient({});
  const limiter = pRateLimit({
    interval: 1000, // 1s
    rate: 10 // 10 API calls per interval
  });
  if (operation === 'Create' || operation === 'Update') {
    // creating new/updating existing parameters
    await Promise.all(
      currentProps.map(async ({ ssmParameterName, value }) => {
        console.info(`putting parameter ${ssmParameterName}...`);
        await limiter(() =>
          ssmClient.send(
            new PutParameterCommand({
              Name: ssmParameterName,
              Value: `${value}`,
              Type: ParameterType.SECURE_STRING,
              Overwrite: true
            })
          )
        );
        console.info(`putting parameter ${ssmParameterName} - SUCCESS`);
        console.info(`tagging parameter ${ssmParameterName}...`);
        await limiter(() =>
          ssmClient.send(
            new AddTagsToResourceCommand({
              ResourceId: ssmParameterName,
              ResourceType: ResourceTypeForTagging.PARAMETER,
              Tags: [
                { Key: tagNames.globallyUniqueStackHash(), Value: process.env.GLOBALLY_UNIQUE_STACK_HASH },
                { Key: tagNames.stackName(), Value: process.env.STACK_NAME }
              ]
            })
          )
        );
        console.info(`tagging parameter ${ssmParameterName} - SUCCESS`);
      })
    );
    if (operation === 'Update') {
      const parameterNamesToBeDeleted = previousProps
        .filter(
          ({ ssmParameterName }) =>
            !currentProps.find(({ ssmParameterName: currSSMParamName }) => currSSMParamName === ssmParameterName)
        )
        .map(({ ssmParameterName }) => ssmParameterName);
      chunkArray(parameterNamesToBeDeleted, 10).map(async (chunk) => {
        console.info(`deleting parameters: ${chunk.join(', ')}...`);
        await limiter(() => ssmClient.send(new DeleteParametersCommand({ Names: chunk })));
        console.info(`deleting parameters: ${chunk.join(', ')} - SUCCESS`);
      });
    }
  }
  if (operation === 'Delete') {
    chunkArray(
      currentProps.map(({ ssmParameterName }) => ssmParameterName),
      10
    ).map(async (chunk) => {
      console.info(`deleting parameters: ${chunk.join(', ')}...`);
      await limiter(() => ssmClient.send(new DeleteParametersCommand({ Names: chunk })));
      console.info(`deleting parameters: ${chunk.join(', ')} - SUCCESS`);
    });
  }
  return { data: {} };
};
