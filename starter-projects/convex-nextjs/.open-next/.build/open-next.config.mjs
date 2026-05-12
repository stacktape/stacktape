import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);import bannerUrl from 'url';const __dirname = bannerUrl.fileURLToPath(new URL('.', import.meta.url));

// stp-temp-open-next.config.ts
var config = {
  "default": {
    "runtime": "node"
  },
  "buildCommand": `npx next build --webpack && node -e "const fs=require('fs');const path=require('path');const file=path.join('.next','required-server-files.json');if(fs.existsSync(file)){const data=JSON.parse(fs.readFileSync(file,'utf8'));data.config=data.config||{};if(data.config.skipTrailingSlashRedirect===undefined)data.config.skipTrailingSlashRedirect=false;if(data.config.serverExternalPackages===undefined)data.config.serverExternalPackages=[];fs.writeFileSync(file,JSON.stringify(data,null,2));}"`
};
var stp_temp_open_next_config_default = config;
export {
  stp_temp_open_next_config_default as default
};
