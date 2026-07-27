import Config

config :phoenix_api,
  ecto_repos: [PhoenixApi.Repo]

config :phoenix_api, PhoenixApi.Endpoint,
  url: [host: "localhost"],
  render_errors: [formats: [json: PhoenixApi.ErrorJSON]],
  pubsub_server: PhoenixApi.PubSub

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
