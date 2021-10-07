import axios from 'axios';

const httpClient = axios.create({
  baseURL: process.env.API_URL,
  headers: { 'Content-Type': 'application/json' },
});

(async () => {
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
})().catch((err) => {
  console.error(err.message);
});
