import * as server from '../entries/pages/_page.server.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.js";
export const imports = ["_app/immutable/nodes/2.CYCCaKmv.js","_app/immutable/chunks/BLGNH_qd.js","_app/immutable/chunks/D9BQLTot.js","_app/immutable/chunks/CVUUW1KX.js","_app/immutable/chunks/cG2U0sJ-.js","_app/immutable/chunks/CGnTuBwj.js"];
export const stylesheets = [];
export const fonts = [];
