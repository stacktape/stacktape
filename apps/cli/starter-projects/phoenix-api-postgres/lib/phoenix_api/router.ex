defmodule PhoenixApi.Router do
  use Phoenix.Router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", PhoenixApi do
    pipe_through :api

    get "/", PageController, :index
    resources "/posts", PostController, only: [:index, :create]
  end
end
