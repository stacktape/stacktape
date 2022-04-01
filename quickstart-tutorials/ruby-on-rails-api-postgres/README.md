# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

- Ruby version

- System dependencies

- Configuration

- Database creation

- Database initialization

- How to run the test suite

- Services (job queues, cache servers, search engines, etc.)

- Deployment instructions

- ...

---

# Quickstart steps

create project:
rails new post_api --api --database=postgresql

generate scaffold:
rails g scaffold Post title:text authorEmail:text content:text

(testing on localhost):
rails db:migrate
