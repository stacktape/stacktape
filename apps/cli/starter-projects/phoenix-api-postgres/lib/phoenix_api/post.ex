defmodule PhoenixApi.Post do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "posts" do
    field :title, :string
    field :content, :string
    field :author_email, :string
    timestamps()
  end

  def changeset(post, attrs) do
    post
    |> cast(attrs, [:title, :content, :author_email])
    |> validate_required([:title])
  end
end
