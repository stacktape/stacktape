// app.js

import express, { json } from 'express';
import cors from 'cors';
import connectDB from './config/db';

// routes
import books from './routes/api/books';

const app = express();

// Connect Database
connectDB();

// cors
app.use(cors({ origin: true, credentials: true }));

// Init Middleware
app.use(json({ extended: false }));

app.get('/', (req, res) => res.send('Hello world!'));

// use Routes
app.use('/api/books', books);

const port = process.env.PORT || 8082;

app.listen(port, () => console.info(`Server running on port ${port}`));
