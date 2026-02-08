defmodule PhoenixApi.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      PhoenixApi.Repo,
      {Phoenix.PubSub, name: PhoenixApi.PubSub},
      PhoenixApi.Endpoint
    ]

    opts = [strategy: :one_for_one, name: PhoenixApi.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
