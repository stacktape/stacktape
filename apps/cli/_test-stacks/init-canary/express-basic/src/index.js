const express = require('express');

const app = express();
app.get('/', (_request, response) => response.json({ fixture: 'express-basic' }));
app.get('/health', (_request, response) => response.json({ ok: true }));
app.listen(process.env.PORT || 3000, '0.0.0.0');
