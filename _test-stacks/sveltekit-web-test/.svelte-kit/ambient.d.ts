
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const ACSetupSvcPort: string;
	export const ACSvcPort: string;
	export const AGENT: string;
	export const ALLUSERSPROFILE: string;
	export const APPDATA: string;
	export const ChocolateyInstall: string;
	export const ChocolateyLastPathUpdate: string;
	export const COLOR: string;
	export const COMMONPROGRAMFILES: string;
	export const CommonProgramW6432: string;
	export const COMPUTERNAME: string;
	export const COMSPEC: string;
	export const DriverData: string;
	export const EDITOR: string;
	export const EFC_9124_1262719628: string;
	export const EFC_9124_1592913036: string;
	export const EFC_9124_2283032206: string;
	export const EFC_9124_2775293581: string;
	export const EFC_9124_3789132940: string;
	export const EXEPATH: string;
	export const FORCE_COLOR: string;
	export const FPS_BROWSER_APP_PROFILE_STRING: string;
	export const FPS_BROWSER_USER_PROFILE_STRING: string;
	export const GITHUB_AUTH_TOKEN: string;
	export const HOME: string;
	export const HOMEDRIVE: string;
	export const HOMEPATH: string;
	export const INIT_CWD: string;
	export const INSTALL_SCRIPTS_BUCKET_NAME: string;
	export const INSTALL_SCRIPTS_PREVIEW_BUCKET_NAME: string;
	export const LOCALAPPDATA: string;
	export const LOGONSERVER: string;
	export const MSYSTEM: string;
	export const NODE: string;
	export const NODE_ENV: string;
	export const NODE_EXE: string;
	export const NODE_NO_WARNINGS: string;
	export const NO_PROXY: string;
	export const npm_command: string;
	export const npm_config_cache: string;
	export const npm_config_globalconfig: string;
	export const npm_config_global_prefix: string;
	export const npm_config_init_module: string;
	export const npm_config_local_prefix: string;
	export const npm_config_node_gyp: string;
	export const npm_config_noproxy: string;
	export const npm_config_npm_version: string;
	export const npm_config_prefix: string;
	export const npm_config_userconfig: string;
	export const npm_config_user_agent: string;
	export const npm_config_yes: string;
	export const npm_execpath: string;
	export const npm_lifecycle_event: string;
	export const npm_lifecycle_script: string;
	export const npm_node_execpath: string;
	export const npm_package_json: string;
	export const npm_package_name: string;
	export const npm_package_version: string;
	export const NPM_PREFIX_JS: string;
	export const NPM_PREFIX_NPX_CLI_JS: string;
	export const NPX_CLI_JS: string;
	export const NUMBER_OF_PROCESSORS: string;
	export const OneDrive: string;
	export const OneDriveConsumer: string;
	export const OPENCODE: string;
	export const OPENCODE_CLIENT: string;
	export const OPENCODE_EXPERIMENTAL_FILEWATCHER: string;
	export const OPENCODE_EXPERIMENTAL_ICON_DISCOVERY: string;
	export const OPENCODE_SERVER_PASSWORD: string;
	export const OPENCODE_SERVER_USERNAME: string;
	export const OS: string;
	export const PATH: string;
	export const PATHEXT: string;
	export const PLINK_PROTOCOL: string;
	export const PNPM_HOME: string;
	export const POWERSHELL_DISTRIBUTION_CHANNEL: string;
	export const POWERSHELL_TELEMETRY_OPTOUT: string;
	export const PROCESSOR_ARCHITECTURE: string;
	export const PROCESSOR_IDENTIFIER: string;
	export const PROCESSOR_LEVEL: string;
	export const PROCESSOR_REVISION: string;
	export const ProgramData: string;
	export const PROGRAMFILES: string;
	export const ProgramW6432: string;
	export const PROMPT: string;
	export const PSModulePath: string;
	export const PUBLIC: string;
	export const PWD: string;
	export const RlsSvcPort: string;
	export const SCHEMAS_BUCKET_NAME: string;
	export const SENTRY_AUTH_TOKEN: string;
	export const SENTRY_ORG: string;
	export const SENTRY_PROJECT: string;
	export const SESSIONNAME: string;
	export const SHLVL: string;
	export const STACKTAPE_API_KEY: string;
	export const STP_DEV_MODE: string;
	export const SYSTEMDRIVE: string;
	export const SYSTEMROOT: string;
	export const TEMP: string;
	export const TERM: string;
	export const TMP: string;
	export const USERDOMAIN: string;
	export const USERDOMAIN_ROAMINGPROFILE: string;
	export const USERNAME: string;
	export const USERPROFILE: string;
	export const WebStorm: string;
	export const WINDIR: string;
	export const XDG_STATE_HOME: string;
	export const ZES_ENABLE_SYSMAN: string;
	export const _: string;
	export const __COMPAT_LAYER: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		ACSetupSvcPort: string;
		ACSvcPort: string;
		AGENT: string;
		ALLUSERSPROFILE: string;
		APPDATA: string;
		ChocolateyInstall: string;
		ChocolateyLastPathUpdate: string;
		COLOR: string;
		COMMONPROGRAMFILES: string;
		CommonProgramW6432: string;
		COMPUTERNAME: string;
		COMSPEC: string;
		DriverData: string;
		EDITOR: string;
		EFC_9124_1262719628: string;
		EFC_9124_1592913036: string;
		EFC_9124_2283032206: string;
		EFC_9124_2775293581: string;
		EFC_9124_3789132940: string;
		EXEPATH: string;
		FORCE_COLOR: string;
		FPS_BROWSER_APP_PROFILE_STRING: string;
		FPS_BROWSER_USER_PROFILE_STRING: string;
		GITHUB_AUTH_TOKEN: string;
		HOME: string;
		HOMEDRIVE: string;
		HOMEPATH: string;
		INIT_CWD: string;
		INSTALL_SCRIPTS_BUCKET_NAME: string;
		INSTALL_SCRIPTS_PREVIEW_BUCKET_NAME: string;
		LOCALAPPDATA: string;
		LOGONSERVER: string;
		MSYSTEM: string;
		NODE: string;
		NODE_ENV: string;
		NODE_EXE: string;
		NODE_NO_WARNINGS: string;
		NO_PROXY: string;
		npm_command: string;
		npm_config_cache: string;
		npm_config_globalconfig: string;
		npm_config_global_prefix: string;
		npm_config_init_module: string;
		npm_config_local_prefix: string;
		npm_config_node_gyp: string;
		npm_config_noproxy: string;
		npm_config_npm_version: string;
		npm_config_prefix: string;
		npm_config_userconfig: string;
		npm_config_user_agent: string;
		npm_config_yes: string;
		npm_execpath: string;
		npm_lifecycle_event: string;
		npm_lifecycle_script: string;
		npm_node_execpath: string;
		npm_package_json: string;
		npm_package_name: string;
		npm_package_version: string;
		NPM_PREFIX_JS: string;
		NPM_PREFIX_NPX_CLI_JS: string;
		NPX_CLI_JS: string;
		NUMBER_OF_PROCESSORS: string;
		OneDrive: string;
		OneDriveConsumer: string;
		OPENCODE: string;
		OPENCODE_CLIENT: string;
		OPENCODE_EXPERIMENTAL_FILEWATCHER: string;
		OPENCODE_EXPERIMENTAL_ICON_DISCOVERY: string;
		OPENCODE_SERVER_PASSWORD: string;
		OPENCODE_SERVER_USERNAME: string;
		OS: string;
		PATH: string;
		PATHEXT: string;
		PLINK_PROTOCOL: string;
		PNPM_HOME: string;
		POWERSHELL_DISTRIBUTION_CHANNEL: string;
		POWERSHELL_TELEMETRY_OPTOUT: string;
		PROCESSOR_ARCHITECTURE: string;
		PROCESSOR_IDENTIFIER: string;
		PROCESSOR_LEVEL: string;
		PROCESSOR_REVISION: string;
		ProgramData: string;
		PROGRAMFILES: string;
		ProgramW6432: string;
		PROMPT: string;
		PSModulePath: string;
		PUBLIC: string;
		PWD: string;
		RlsSvcPort: string;
		SCHEMAS_BUCKET_NAME: string;
		SENTRY_AUTH_TOKEN: string;
		SENTRY_ORG: string;
		SENTRY_PROJECT: string;
		SESSIONNAME: string;
		SHLVL: string;
		STACKTAPE_API_KEY: string;
		STP_DEV_MODE: string;
		SYSTEMDRIVE: string;
		SYSTEMROOT: string;
		TEMP: string;
		TERM: string;
		TMP: string;
		USERDOMAIN: string;
		USERDOMAIN_ROAMINGPROFILE: string;
		USERNAME: string;
		USERPROFILE: string;
		WebStorm: string;
		WINDIR: string;
		XDG_STATE_HOME: string;
		ZES_ENABLE_SYSMAN: string;
		_: string;
		__COMPAT_LAYER: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
