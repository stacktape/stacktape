import Config

config :phoenix_api, PhoenixApi.Endpoint,
  http: [port: {:system, "PORT"}],
  url: [host: {:system, "HOST"}, port: 443, scheme: "https"],
  server: true
