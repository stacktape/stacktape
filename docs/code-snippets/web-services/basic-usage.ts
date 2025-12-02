import express from 'express';

const app = express();

app.get('/', async (req, res) => {
  res.send({ message: 'Hello' });
});

// this environment variable is automatically injected by Stacktape
app.listen(process.env.PORT, () => {
  console.info(`Server running on port ${process.env.PORT}`);
});
