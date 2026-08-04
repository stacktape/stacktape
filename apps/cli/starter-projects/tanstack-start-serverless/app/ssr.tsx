import { createStartHandler, defaultStreamHandler } from '@tanstack/start/server';
import { createRouter } from './router';

export default createStartHandler({ createRouter })(defaultStreamHandler);
