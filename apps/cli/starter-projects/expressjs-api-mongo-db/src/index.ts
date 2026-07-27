import express from 'express';
import { connectMongoose, Post } from './mongoose';

const app = express();

app.use(express.json());

app.get('/posts', async (req, res) => {
  const posts = await Post.find({});
  res.send({ message: 'success', data: posts.map((post) => post.toJSON()) });
});

app.post('/posts', async (req, res) => {
  const postData = await Post.create({
    title: req.body.title,
    content: req.body.content,
    authorEmail: req.body.authorEmail
  });
  res.send({ message: 'success', data: postData });
});

app.listen(process.env.PORT, async () => {
  await connectMongoose();
  console.info(`Api container started. Listening on port ${process.env.PORT}`);
});
