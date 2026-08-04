import Config

if config_env() == :prod do
  database_url = System.get_env("STP_MAIN_DATABASE_CONNECTION_STRING") ||
    raise "STP_MAIN_DATABASE_CONNECTION_STRING not set"

  config :phoenix_api, PhoenixApi.Repo,
    url: database_url,
    ssl: true,
    ssl_opts: [verify: :verify_none],
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

  secret_key_base = System.get_env("SECRET_KEY_BASE") ||
    raise "SECRET_KEY_BASE not set"

  config :phoenix_api, PhoenixApi.Endpoint,
    http: [port: String.to_integer(System.get_env("PORT") || "3000")],
    secret_key_base: secret_key_base,
    server: true
end
