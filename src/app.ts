import express from 'express';

import { errorHandler } from './middlewares/error-handler.js';

export const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.use(errorHandler);
