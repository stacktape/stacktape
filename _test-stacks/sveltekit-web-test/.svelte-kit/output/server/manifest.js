export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.CsDQMBGM.js",app:"_app/immutable/entry/app.Bey14lid.js",imports:["_app/immutable/entry/start.CsDQMBGM.js","_app/immutable/chunks/DJpcPpVi.js","_app/immutable/chunks/D9BQLTot.js","_app/immutable/chunks/BWIwA1Iu.js","_app/immutable/entry/app.Bey14lid.js","_app/immutable/chunks/D9BQLTot.js","_app/immutable/chunks/cG2U0sJ-.js","_app/immutable/chunks/BLGNH_qd.js","_app/immutable/chunks/BWIwA1Iu.js","_app/immutable/chunks/S7OL723J.js","_app/immutable/chunks/CGnTuBwj.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
