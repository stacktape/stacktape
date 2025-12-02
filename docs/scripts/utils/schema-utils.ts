import type { CommandArg } from '../../src/components/Mdx/SdkMethodsApiReference';
import orderBy from 'lodash/orderBy.js';
import { marked } from './marked-mdx-parser';

export const parseDescription = async (description: string) => {
  const [sd, ld] = (description || '').split('---');
  const [parsedSd, parsedLd] = await Promise.all([marked(sd.replace('####', '')), ld && marked(ld)]);
  return { parsedSd, parsedLd };
};

export const getSortedArgs = async (args: Record<string, any>): Promise<CommandArg[]> => {
  const adjustedArgs = await Promise.all(
    Object.entries(args).map(async ([arg, argDetails]) => {
      if (arg === 'region') {
        // we already have possible values from the enum.
        argDetails.description = argDetails.description.replace(
          '- Available options: us-east-2, us-east-1, us-west-1, us-west-2, ap-east-1, ap-south-1, ap-northeast-3, ap-northeast-2, ap-southeast-1, ap-southeast-2, ap-northeast-1, ca-central-1, eu-central-1, eu-west-1, eu-west-2, eu-west-3, eu-north-1, me-south-1, sa-east-1, af-south-1, eu-south-1',
          ''
        );
      }
      const { parsedLd, parsedSd } = await parseDescription(argDetails.description);
      return {
        ...argDetails,
        name: arg,
        required: argDetails.required || ['region', 'stage'].includes(arg),
        shortDescription: parsedSd,
        longDescription: parsedLd
      };
    })
  );
  return orderBy(adjustedArgs, ['required', 'name'], ['desc', 'asc']);
};

export const getMdxDescription = (description) => {
  const [sd, ld] = description.split('---');
  return `${sd.replace('####', '')}\n<br />\n${ld ? `${ld}` : ''}`;
};
