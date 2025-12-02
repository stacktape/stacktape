import express from 'express';
import { json } from 'body-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(json());

app.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany();
    res.send({ message: 'success', data: posts });
  } catch (error) {
    // If anything goes wrong, log the error.
    // You can later access the log data in the AWS console.
    console.error(error);
    res.status(400).send({ message: 'error', error: error.message });
  }
});

app.post('/posts', async (req, res) => {
  try {
    // save post data to the database using the Prisma client
    const postData = await prisma.post.create({
      data: {
        title: req.body.title,
        content: req.body.content,
        authorEmail: req.body.authorEmail
      }
    });
    res.send({ message: 'success', data: postData });
  } catch (error) {
    console.error(error);
    res.status(400).send({ message: 'error', error: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.info(`Api container started. Listening on port ${process.env.PORT}`);
});
