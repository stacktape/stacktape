import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

app.get('/posts', async (req, res) => {
  const posts = await prisma.post.findMany();
  res.send({ message: 'success', data: posts });
});

app.post('/posts', async (req, res) => {
  // save post data to the database using the Prisma client
  const postData = await prisma.post.create({
    data: {
      title: req.body.title,
      content: req.body.content,
      authorEmail: req.body.authorEmail
    }
  });
  res.send({ message: 'success', data: postData });
});

app.listen(process.env.PORT, () => {
  console.info(`Api container started. Listening on port ${process.env.PORT}`);
});
