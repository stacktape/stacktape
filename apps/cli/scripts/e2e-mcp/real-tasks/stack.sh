#!/usr/bin/env bash
# Deploys, seeds or deletes the shop-api stack the real-task suite runs against. It runs the source CLI with the bench
# home from prepare.sh, so the stack lands in the disposable stacktape-e2e connection, and with local AWS credentials
# hidden, so nothing here can fall back to another account.
#
# Usage: stack.sh check | deploy | seed | delete
set -euo pipefail

cli_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
bench="${MCP_BENCH_DIR:-$HOME/.cache/stacktape-mcp-bench}"
stack_args=(--projectName shop-api --stage production --region eu-west-1 --awsAccount stacktape-e2e)
expected_account_id=597581086285

stacktape() {
  (
    cd "$cli_root"
    HOME="$bench/home" \
      AWS_CONFIG_FILE="$bench/no-aws-config" \
      AWS_SHARED_CREDENTIALS_FILE="$bench/no-aws-credentials" \
      AWS_EC2_METADATA_DISABLED=true \
      bun scripts/dev.ts "$@"
  )
}

api_url() {
  stacktape info:stack "${stack_args[@]}" --agent 2>/dev/null |
    python3 -I -c "import json,re,sys
for line in sys.stdin:
    found = re.search(r'https://apigateway-[a-z0-9-]+\.stacktape-app\.com|https://[a-z0-9]+\.execute-api\.eu-west-1\.amazonaws\.com', line)
    if found:
        print(found.group(0)); break"
}

# Refuses to continue unless the stacktape-e2e connection is the expected disposable account. The whoami record also
# holds the user's name and email, so only the connection fields are read.
check_account() {
  stacktape info:whoami --agent 2>/dev/null | python3 -I -c "import json,sys
for line in sys.stdin:
    try: record = json.loads(line)
    except ValueError: continue
    if record.get('type') != 'result': continue
    accounts = ((record.get('data') or {}).get('result') or {}).get('connectedAwsAccounts') or []
    match = [a for a in accounts if a.get('name') == 'stacktape-e2e' and a.get('state') == 'ACTIVE']
    sys.exit(0 if len(match) == 1 and match[0].get('awsAccountId') == '$expected_account_id' else 1)
sys.exit(1)" || { echo "stacktape-e2e is not the expected account $expected_account_id; nothing was changed." >&2; exit 1; }
}

case "${1:-}" in
  check)
    check_account
    echo "stacktape-e2e is account $expected_account_id."
    ;;
  deploy)
    check_account
    stacktape deploy "${stack_args[@]}" --currentWorkingDirectory "$bench/template" --autoConfirmOperation --agent \
      > "$bench/deploy.jsonl" 2> "$bench/deploy.err"
    # Deploy writes the stack's outputs (including the API URL) into the project; every run starts without them.
    rm -rf "$bench/template/.stacktape-stack-info" "$bench/template/.stacktape"
    tail -n 1 "$bench/deploy.jsonl"
    ;;
  seed)
    url="$(api_url)"
    [ -n "$url" ] || { echo "API URL not found"; exit 1; }
    echo "$url" > "$bench/api-url"
    post() { curl -sf -X POST "$url/orders" -H 'content-type: application/json' -d "$1"; }
    post '{"items":[{"sku":"mug-blue","quantity":2,"priceCents":1500}],"customer":{"name":"Ada","email":"Ada@Example.com"}}' > /dev/null
    post '{"items":[{"sku":"tee-black","quantity":1,"priceCents":2500}],"customer":{"name":"Lin","email":"lin@example.com"}}' > /dev/null
    # An order from the old checkout, without customer details: opening it fails with a 500.
    legacy="$(post '{"items":[{"sku":"poster-a2","quantity":1,"priceCents":900}]}' | python3 -I -c "import json,sys; print(json.load(sys.stdin)['data']['id'])")"
    echo "$legacy" > "$bench/legacy-order-id"
    for _ in 1 2 3 4 5; do curl -s -o /dev/null -w '%{http_code}\n' "$url/orders/$legacy"; done
    echo "API $url, failing order $legacy"
    ;;
  delete)
    check_account
    stacktape delete "${stack_args[@]}" --autoConfirmOperation --agent > "$bench/delete.jsonl" 2> "$bench/delete.err"
    tail -n 1 "$bench/delete.jsonl"
    if stacktape info:stack "${stack_args[@]}" --agent 2>/dev/null | grep -q '"type":"result","ok":true'; then
      echo "The stack still exists after delete." >&2
      exit 1
    fi
    echo "Stack deleted and verified gone."
    ;;
  *)
    echo "Usage: stack.sh check | deploy | seed | delete" >&2
    exit 2
    ;;
esac
