import Config

config :phoenix_api, PhoenixApi.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "phoenix_api_dev",
  port: 5432,
  pool_size: 10

config :phoenix_api, PhoenixApi.Endpoint,
  http: [port: 4000],
  debug_errors: true,
  check_origin: false
