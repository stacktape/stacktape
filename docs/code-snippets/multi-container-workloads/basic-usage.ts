import express from 'express';

const app = express();

app.get('/', async (req, res) => {
  res.send({ message: 'Hello' });
});

app.listen(process.env.PORT, () => {
  console.info(`Server running on port ${process.env.PORT}`);
});
