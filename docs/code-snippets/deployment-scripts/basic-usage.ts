import fetch from 'node-fetch';

export default async (event) => {
  const { apiURL } = event;

  // do whatever you want with apiURL ...
  const result = await fetch(apiURL);

  // fail the script if the test fails
  if (result.statusCode === 404) {
    throw Error('API test failed');
  }
};
