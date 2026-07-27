defmodule PhoenixApi.ErrorJSON do
  def render("404.json", _assigns), do: %{error: "Not found"}
  def render("500.json", _assigns), do: %{error: "Internal server error"}
end
