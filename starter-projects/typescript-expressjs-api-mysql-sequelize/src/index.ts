import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { transports } from 'winston';
import { logger } from 'express-winston';
import { syncDbModel } from './services/sequelize';
import { postRouter } from './routes/post';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(json());
app.use(logger({ transports: [new transports.Console()], meta: true, expressFormat: true, colorize: false }));

app.use('/post', postRouter);

const start = async () => {
  await syncDbModel();
  app.listen(process.env.PORT, () => {
    console.info(`Listening on port ${process.env.PORT}`);
  });
};

start();
