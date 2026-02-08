

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.ctHp3yIZ.js","_app/immutable/chunks/BLGNH_qd.js","_app/immutable/chunks/D9BQLTot.js","_app/immutable/chunks/S7OL723J.js"];
export const stylesheets = [];
export const fonts = [];
