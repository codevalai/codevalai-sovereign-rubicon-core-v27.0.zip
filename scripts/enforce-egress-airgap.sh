#!/usr/bin/env bash
set -euo pipefail

# Preserve GitHub Actions hostedtoolcache Node/npm/npx even when invoked via sudo secure_path
for tool_dir in /opt/hostedtoolcache/node/*/x64/bin /opt/hostedtoolcache/node/*/arm64/bin /usr/local/bin; do
  if [[ -d "$tool_dir" ]] && [[ ":$PATH:" != *":$tool_dir:"* ]]; then
    PATH="$tool_dir:$PATH"
  fi
done
export PATH

MODE="${1:-allowlist}" # "allowlist", "total-airgap", "airgap-exec", or "lift"

run_as_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo -E env "PATH=$PATH" "$@"
  fi
}

if [[ "$MODE" == "allowlist" ]]; then
  echo "[SOVEREIGN-FIREWALL] Resolving authoritative IPv4 blocks for npm & GitHub..."
  ALLOWED_IPS=$(dig +short registry.npmjs.org github.com api.github.com 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | sort -u | paste -sd "," - || true)

  if [[ -n "$ALLOWED_IPS" ]]; then
    ELEMENTS_BLOCK="elements = { 127.0.0.1, ${ALLOWED_IPS} }"
  else
    ELEMENTS_BLOCK="elements = { 127.0.0.1 }"
  fi

  run_as_root nft flush ruleset
  run_as_root nft -f - <<NFT_EOF
table inet sovereign_filter {
  set allowed_ipv4 {
    type ipv4_addr
    flags interval
    ${ELEMENTS_BLOCK}
  }

  chain output {
    type filter hook output priority 0; policy drop;
    oifname "lo" accept
    ct state established,related accept
    udp dport 53 accept
    tcp dport 53 accept
    ip daddr 168.63.129.16 accept
    ip daddr @allowed_ipv4 tcp dport 443 accept
    counter log prefix "[SOVEREIGN-EGRESS-BLOCKED] " drop
  }
}
NFT_EOF
  echo "[SOVEREIGN-FIREWALL] Strict nftables egress whitelist active."

elif [[ "$MODE" == "airgap-exec" ]]; then
  if [[ "${2:-}" == "--" ]]; then
    shift 2
  else
    shift 1
  fi
  if [[ $# -eq 0 ]]; then
    echo "Usage: $0 airgap-exec -- <command...>"
    exit 1
  fi

  if [[ $# -eq 1 ]]; then
    EXEC_CMD="$1"
  else
    EXEC_CMD=$(printf '%q ' "$@")
  fi

  echo "[SOVEREIGN-AIRGAP-NETNS] Executing inside zero-egress loopback-only kernel network namespace (node=$(command -v node || echo missing))..."
  run_as_root unshare --net bash -c "
    set -euo pipefail
    export PATH=\"${PATH}\"
    ip link set lo up
    if command -v curl >/dev/null 2>&1; then
      if curl -s --connect-timeout 1 --max-time 2 https://1.1.1.1 >/dev/null 2>&1; then
        echo 'FATAL: Kernel netns airgap breach detected!'
        exit 1
      fi
    fi
    echo '[AIRGAP-VERIFIED] External sockets unreachable inside isolated netns (only lo exists).'
    ${EXEC_CMD}
  "

elif [[ "$MODE" == "total-airgap" ]]; then
  echo "[SOVEREIGN-FIREWALL] Engaging non-loopback NEW socket block (preserving established CI control channel)..."
  run_as_root nft flush ruleset
  run_as_root nft -f - <<NFT_EOF
table inet sovereign_airgap {
  chain output {
    type filter hook output priority 0; policy drop;
    oifname "lo" accept
    ct state established,related accept
    ip daddr 168.63.129.16 accept
    counter drop
  }
}
NFT_EOF
  echo "[SOVEREIGN-FIREWALL] Airgap locked for new outbound sockets."

elif [[ "$MODE" == "lift" ]]; then
  run_as_root nft flush ruleset || true
  echo "[SOVEREIGN-FIREWALL] nftables ruleset lifted."

else
  echo "Unknown mode: $MODE"
  exit 1
fi
