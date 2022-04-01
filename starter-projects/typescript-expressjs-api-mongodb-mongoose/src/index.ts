import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { transports } from 'winston';
import { logger } from 'express-winston';
import { postRouter } from './routes/post';
import { connectMongoose } from './services/mongoose';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(json());
app.use(logger({ transports: [new transports.Console()], meta: true, expressFormat: true, colorize: false }));

app.use('/post', postRouter);

const start = async () => {
  await connectMongoose();
  app.listen(process.env.PORT, () => {
    console.info(`Listening on port ${process.env.PORT}`);
  });
};

start();
