import { StartClient, mount } from '@solidjs/start/client';

export default () => mount(() => <StartClient />, document.getElementById('app')!);
