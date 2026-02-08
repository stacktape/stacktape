defmodule PhoenixApi.Endpoint do
  use Phoenix.Endpoint, otp_app: :phoenix_api

  plug Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason

  plug PhoenixApi.Router
end
