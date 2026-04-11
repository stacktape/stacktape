---
docType: cli-ref
title: "CLI: domain:add"
tags:
  - domain:add
  - domain
  - add
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape domain:add`

Adds a domain to your AWS account.

Once added, the domain and its subdomains can be used with various resources, such as Web Services, Hosting Buckets, and API Gateways. Before adding a domain, please review the [Domains and Certificates documentation](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).

## Required Arguments

- `--region`

## Usage

```bash
stacktape domain:add --region <value>
```
