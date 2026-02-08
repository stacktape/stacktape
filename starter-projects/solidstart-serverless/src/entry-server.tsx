import { createHandler, StartServer } from '@solidjs/start/server';

import App from './app';

export default createHandler(() => <StartServer document={App} />);
