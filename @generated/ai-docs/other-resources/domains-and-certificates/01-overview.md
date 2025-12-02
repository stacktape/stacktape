# Overview

This page explains how to manage custom domains and TLS certificates in Stacktape.

If you don't have a domain, you can [register one](./06-registering-a-domain.md). If you already have a domain, you have two options:

1.  **Use AWS Route 53 as your DNS provider (recommended):** If you use Route 53, Stacktape can automatically manage your domain, generate and renew TLS certificates, and create DNS records for your resources. See [Managing domains with Stacktape](./02-managing-domains-with-stacktape.md). If you currently use a third-party DNS provider, you can [migrate your domain](./03-migrating-an-existing-domain.md) to Route 53.
2.  **Use a third-party DNS provider:** If you use a provider like Cloudflare or GoDaddy, you must manage your DNS records manually. You will also need to create or import a custom TLS certificate in the [AWS Certificate Manager console](https://console.aws.amazon.com/acm/home#/certificates/list) and reference it in your Stacktape configuration. See [Using a third-party DNS](./07-using-a-3rd-party-dns.md).