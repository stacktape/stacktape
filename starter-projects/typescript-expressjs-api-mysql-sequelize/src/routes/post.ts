import { Router } from 'express';
import { Post } from '../model/post';

export const postRouter = Router();

postRouter.get('/:id', async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    res.send({ message: 'success', data: post.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});

postRouter.get('/', async (req, res) => {
  try {
    const posts = await Post.findAll();
    res.send({ message: 'success', data: posts.map((post) => post.toJSON()) });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});

postRouter.post('/', async (req, res) => {
  try {
    const post = await Post.create(req.body);
    res.send({ message: 'success', data: post.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});

postRouter.put('/:id', async (req, res) => {
  try {
    await Post.update(req.body, { where: { id: req.params.id } });
    const updatedPost = await Post.findByPk(req.params.id);
    res.send({ message: 'success', data: updatedPost.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});

postRouter.delete('/:id', async (req, res) => {
  try {
    await Post.destroy({ where: { id: req.params.id } });
    res.send({ message: 'success', data: { id: req.params.id } });
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: 'error', error: err.message });
  }
});
