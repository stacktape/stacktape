- **bot** — Always-on [worker service](https://docs.stacktape.com/compute-resources/worker-services/) that maintains a
  persistent WebSocket connection to Discord's gateway. Unlike HTTP services, a worker service has no public URL or load
  balancer — it simply runs continuously. The bot token is injected via `$Secret('discord-bot-token')` so it never
  appears in source control. Sized at 0.25 vCPU / 512 MB, which is sufficient for a single-shard bot handling typical
  guild traffic.
