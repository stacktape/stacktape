import bcrypt from 'bcrypt';
import _ from 'lodash';

export default async (_event: any) => {
  const hash = await bcrypt.hash('password123', 10);
  const shuffled = _.shuffle([1, 2, 3, 4, 5]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Lambda 1 - using bcrypt and lodash',
      hash: `${hash.substring(0, 20)}...`,
      shuffled
    })
  };
};
