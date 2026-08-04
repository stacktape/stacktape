FROM hexpm/elixir:1.18.4-erlang-27.3.4-alpine-3.21.3 AS build
RUN apk add --no-cache build-base git
WORKDIR /app
ENV MIX_ENV=prod
RUN mix local.hex --force && mix local.rebar --force
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV && mix deps.compile
COPY config config
COPY lib lib
COPY priv priv
RUN mix compile && mix release

FROM alpine:3.21.3
RUN apk add --no-cache libstdc++ openssl ncurses-libs
WORKDIR /app
COPY --from=build /app/_build/prod/rel/phoenix_api ./
ENV PORT=3000
EXPOSE 3000
CMD ["/bin/sh", "-c", "bin/phoenix_api eval 'PhoenixApi.Release.migrate()' && bin/phoenix_api start"]
