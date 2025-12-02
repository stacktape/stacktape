export default async (event) => {
  const { response } = event.Records[0].cf;

  response.headers['set-cookie'] = [
    {
      key: 'Set-Cookie',
      value: 'my-experimental-cookie=cookie-value'
    }
  ];

  return response;
};
