# Git-provider E2E checklist

Use the dev organization and disposable repositories where possible. Before starting, decide whether the changed route
is local or externally invoked:

- Local tRPC/API calls exercise the API started by `pnpm dev:console`.
- OAuth callbacks, app installation callbacks, Forge lifecycle events, and webhooks arrive at the deployed dev API or
  Lambda. Deploy `console-app-dev` first when those handlers changed.

For GitHub, GitLab, and Bitbucket, cover the applicable paths below.

1. Start from no connection and connect the provider.
2. Cancel or deny provider authorization; verify a clear recovery path and no partial connection.
3. Complete authorization; verify the connection appears once with the correct provider/account label.
4. Reload and open a second tab; verify the persisted connection remains usable.
5. List repositories, including private repositories, pagination/search, an empty result, and a name with punctuation.
6. Bind a repository to a project and verify the stored stable provider/repository identity, not only its clone URL.
7. Trigger the smallest safe provider event and verify ingress, queue/worker handling, and user-visible result.
8. Disconnect, revoke, or uninstall at the provider; verify stale credentials fail clearly and reconnect succeeds.
9. Switch organizations and verify a connection cannot be read, selected, updated, or deleted across the boundary.
10. Repeat connection/reconnection once to catch duplicate webhook, grant, or installation creation.

Provider-specific edges:

- GitHub: installation with selected repositories versus all repositories; temporary user authorization cleanup.
- GitLab: multiple groups/namespaces, expired or revoked OAuth grant, and webhook reconciliation after reconnect.
- Bitbucket: workspace selection, Forge installation/uninstallation, brace-form UUID handling, and repository access
  after the paired installation changes.

For each case, save the expected result, actual result, relevant non-secret request/status information, and whether the
failure is UI, local API, deployed callback/ingress, queue worker, provider configuration, or test setup.
