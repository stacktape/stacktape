defmodule PhoenixApi.PageController do
  use Phoenix.Controller, formats: [:json]

  def index(conn, _params) do
    json(conn, %{message: "Phoenix API running on AWS"})
  end
end
