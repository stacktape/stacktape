## openWebUi

Web service running [Open WebUI](https://github.com/open-webui/open-webui) using the official prebuilt Docker image
(`ghcr.io/open-webui/open-webui:main`).

- **Packaging**: `prebuilt-image` — pulls the official Open WebUI image directly from GitHub Container Registry. No
  build step needed.
- **Resources**: 1 vCPU and 2048 MB memory — sufficient for a small team. Scale up for heavier usage.
- **Environment variables**:
  - `PORT` — the port Open WebUI listens on (set to `3000` to match the web service default).
  - `OPENAI_API_KEY` — API key for OpenAI (stored as a Stacktape secret). You can also configure Anthropic, Bedrock, or
    other providers through the Open WebUI admin panel after deploy.
