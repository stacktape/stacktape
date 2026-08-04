defmodule PhoenixApi.PostController do
  use Phoenix.Controller, formats: [:json]

  alias PhoenixApi.{Repo, Post}
  import Ecto.Query

  def index(conn, _params) do
    posts = Repo.all(from p in Post, order_by: [desc: p.inserted_at])
    json(conn, %{data: Enum.map(posts, &serialize/1)})
  end

  def create(conn, params) do
    changeset = Post.changeset(%Post{}, params)

    case Repo.insert(changeset) do
      {:ok, post} ->
        conn
        |> put_status(:created)
        |> json(%{message: "Post created", data: serialize(post)})

      {:error, changeset} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Validation failed", details: format_errors(changeset)})
    end
  end

  defp serialize(post) do
    %{
      id: post.id,
      title: post.title,
      content: post.content,
      authorEmail: post.author_email
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
  end
end
