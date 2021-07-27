import fastify from 'fastify';
import { PostModel } from '../db-models';
import { syncDbModel } from '../utils/sequelize';

const server = fastify();

server.get('/', async (req, res) => {
  const posts = PostModel.findAll();

  console.info({ req, res });

  return { posts };
});

const start = async () => {
  await syncDbModel();
  await server.listen(3000);
};

start();
