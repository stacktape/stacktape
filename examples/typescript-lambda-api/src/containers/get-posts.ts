import express, { json } from 'express';
import cors from 'cors';
import { PostModel } from '../db-models';
import { syncDbModel } from '../utils/sequelize';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(json());

app.get('/api/posts', async (req, res) => {
  const posts = PostModel.findAll();

  console.info({ req, res });

  res.send({ posts });
});

const start = async () => {
  await syncDbModel();
  app.listen(process.env.PORT, () => {
    console.info(`Listening on port ${process.env.PORT}`);
  });
};

start();
