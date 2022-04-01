const axios = require('axios');
const { Stacktape } = require('stacktape');
const yargs = require('yargs-parser');

const cliArgs = yargs(process.argv);

(async () => {
  const stacktape = new Stacktape({ region: cliArgs.region, stage: cliArgs.stage });
  // Download information about the deployed stack
  const { result: stackInfo } = await stacktape.stackInfo();

  const httpClient = axios.create({
    // get the URL from of the myGateway http-api-gateway
    baseURL: stackInfo.resources.myGateway.outputs.url.value,
    headers: { 'Content-Type': 'application/json' },
  });

  const { data: createPostResponse } = await httpClient.post('/post', {
    title: 'My post title',
    content: 'This is my first post. Powered by stacktape.',
    authorEmail: 'info@stacktape.com',
  });
  console.info('Create post response: ', createPostResponse);

  const { data: updatePostResponse } = await httpClient.put(`/post/${createPostResponse.data.id}`, {
    content: 'This is updated post. Powered by stacktape.',
  });
  console.info('Update post response: ', updatePostResponse);

  const { data: getPostResponse } = await httpClient.get(`/post/${updatePostResponse.data.id}`);
  console.info('Get post response: ', getPostResponse);

  const { data: getAllPostsResponse } = await httpClient.get('/post');
  console.info('Get all posts response: ', getAllPostsResponse);

  const { data: deletePostResponse } = await httpClient.delete(`/post/${updatePostResponse.data.id}`);
  console.info('Delete post response: ', deletePostResponse);
})().catch((error) => {
  if (error.response) {
    console.error(error.response.status, error.response.data);
  } else if (error.request) {
    console.error(error.request);
  } else {
    console.error(error);
  }
});
