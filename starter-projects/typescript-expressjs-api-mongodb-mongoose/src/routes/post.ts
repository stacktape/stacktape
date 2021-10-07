import { Router } from 'express';
import { Post } from '../model/post';

export const postRouter = Router();

const serialize = (model) => {
  const { _id, ...data } = model.toJSON();
  return { id: _id, ...data };
};

postRouter.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.send({ message: 'success', data: serialize(post) });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});

postRouter.get('/', async (req, res) => {
  try {
    const posts = await Post.find({});
    res.send({ message: 'success', data: posts.map(serialize) });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});

postRouter.post('/', async (req, res) => {
  try {
    const createdPost = await Post.create(req.body);
    res.send({ message: 'success', data: serialize(createdPost) });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});

postRouter.put('/:id', async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body);
    res.send({ message: 'success', data: serialize(updatedPost) });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});

postRouter.delete('/:id', async (req, res) => {
  try {
    await Post.deleteOne({ _id: req.params.id });
    res.send({ message: 'success', data: { id: req.params.id } });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});
