import bcrypt from 'bcrypt';

export const handler = async (_event: any) => {
  const rounds = 12;
  const hash = await bcrypt.hash('secure-password', rounds);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Lambda 3 - using only bcrypt',
      rounds,
      hash: `${hash.substring(0, 20)}...`
    })
  };
};
