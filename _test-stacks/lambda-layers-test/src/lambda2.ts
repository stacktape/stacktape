import bcrypt from 'bcrypt';
import _ from 'lodash';

export default async (event: any) => {
  const isValid = await bcrypt.compare('password123', event.hash || '');
  const sorted = _.sortBy([3, 1, 4, 1, 5, 9, 2, 6], (n) => n);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Lambda 2 - using bcrypt and lodash',
      isValid,
      sorted
    })
  };
};
